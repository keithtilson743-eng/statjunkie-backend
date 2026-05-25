const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const GROQ_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => res.json({ status: "running" }));

app.post("/props", async (req, res) => {
  const { league } = req.body;
  if (!league) return res.status(400).json({ error: "league required" });
  const date = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
  const prompt = `Today is ${date}. League: ${league}. You are a sharp sports betting analyst. Give me 5 elite PrizePicks player props with 8.0+ confidence. Return ONLY raw JSON starting with { ending with }. {"slate":"${league}","date":"${date}","summary":"sharp sentence about today edge","best_lineup":["Player UNDER 16.5 Points","Player UNDER 13.5 Points"],"top_props":[{"player":"Full Name","team":"NYL","opponent":"PDX","stat":"Points","line":16.5,"pick":"UNDER","edge_score":8.5,"confidence":9.0,"combined_score":8.75,"reasoning":"3-4 sharp sentences why this hits","blowout_risk":"HIGH","game_time":"7:00 PM ET","risk_factors":[{"factor":"Blowout Risk","level":"HIGH","detail":"88% favourite"},{"factor":"Minutes Risk","level":"HIGH","detail":"Pulled in Q4"},{"factor":"Recent Form","level":"LOW","detail":"11,11,14 last 3"}]}]}`;
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }]
      }),
    });
    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message });
    const raw = d.choices?.[0]?.message?.content || "";
    const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
    if (s === -1 || e === -1) return res.status(500).json({ error: "No JSON in response" });
    res.json(JSON.parse(raw.slice(s, e + 1)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/", (req, res) => res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><title>StatJunkie</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#050505;color:#fff;font-family:system-ui,sans-serif}button{font-family:inherit;cursor:pointer;border:none}
.hdr{background:#0d0500;border-bottom:1px solid #1a0800;padding:50px 16px 12px;position:sticky;top:0;z-index:100}
.logo{font-size:28px;font-weight:900}.s{color:#fff}.j{background:linear-gradient(135deg,#ff4400,#ff8800,#ffcc00);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.tabs{display:flex;gap:6px;overflow-x:auto;margin-top:10px}
.tab{padding:6px 14px;border-radius:8px;font-size:11px;font-weight:900;white-space:nowrap;border:1px solid #1a0800;background:#0d0500;color:#3a2010}
.tab.on{background:linear-gradient(135deg,#cc2200,#ff6600);border-color:transparent;color:#fff}
.body{padding:14px 16px;max-width:600px;margin:0 auto;padding-bottom:40px}
.abtn{width:100%;padding:16px;background:linear-gradient(135deg,#cc2200,#ff4400,#ff8800);border-radius:14px;color:#fff;font-size:15px;font-weight:900;letter-spacing:1px;margin-bottom:16px;box-shadow:0 4px 28px #ff440044}
.abtn:disabled{background:#1a0800;box-shadow:none}
.sum{background:#0d0500;border:1px solid #1a0800;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:#886644;line-height:1.6}
.card{background:#0d0500;border:1px solid #1a0800;border-radius:16px;padding:14px;margin-bottom:12px}
.pname{font-size:19px;font-weight:900;color:#fff;margin:8px 0 2px}
.mtch{font-size:11px;color:#3a2010;margin-bottom:8px}
.line{font-size:22px;font-weight:900;margin-bottom:8px}
.why{font-size:13px;color:#886644;line-height:1.6;margin-bottom:10px}
.cbtn{padding:9px 14px;background:#1a0800;border:1px solid #2a1000;border-radius:8px;color:#664422;font-size:11px;font-weight:700;width:100%}
.err{background:#1a0800;border:1px solid #ff440033;border-radius:12px;padding:14px;margin-bottom:14px;color:#ff6666;font-size:13px;line-height:1.6}
.rbtn{margin-top:10px;background:#ff440022;border:1px solid #ff4400;border-radius:8px;color:#ff6600;padding:7px 14px;font-size:12px;font-weight:700}
.toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#0d0500;border:1px solid #ff440033;border-radius:20px;padding:10px 20px;color:#ff8800;font-size:13px;font-weight:700;z-index:999;pointer-events:none;transition:opacity .3s;white-space:nowrap}
@keyframes spin{to{transform:rotate(360deg)}}.sp{width:18px;height:18px;border:2px solid #2a1000;border-top:2px solid #ff6600;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px}
</style></head><body>
<div class="hdr">
<div style="font-size:9px;color:#ff440055;letter-spacing:3px;font-weight:700">PRIZEPICKS INTELLIGENCE</div>
<div class="logo"><span class="s">STAT</span><span class="j">JUNKIE</span> 🎯</div>
<div class="tabs" id="tabs"></div>
</div>
<div class="body">
<button class="abtn" id="abtn" onclick="go()">⚡ ANALYZE WNBA PROPS</button>
<div id="out"></div>
</div>
<div class="toast" id="toast" style="opacity:0"></div>
<script>
var L=["WNBA","NBA","MLB","NHL","NFL"],league="WNBA",props=[],tabs=document.getElementById("tabs");
L.forEach(function(l){var b=document.createElement("button");b.className="tab"+(l==="WNBA"?" on":"");b.textContent=l;b.onclick=function(){league=l;document.querySelectorAll(".tab").forEach(function(x,i){x.className="tab"+(L[i]===l?" on":"");});document.getElementById("abtn").textContent="⚡ ANALYZE "+l+" PROPS";document.getElementById("out").innerHTML="";};tabs.appendChild(b);});
async function go(){var btn=document.getElementById("abtn");btn.disabled=true;btn.innerHTML='<span class="sp"></span>FINDING '+league+' PROPS...';document.getElementById("out").innerHTML="";
try{var r=await fetch("/props",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({league:league})});var d=await r.json();
if(d.error)throw new Error(d.error);if(!d.top_props||!d.top_props.length)throw new Error("No props returned");props=d.top_props;
var h='<div class="sum">'+d.summary+"</div>";
d.top_props.forEach(function(p,i){var pc=p.pick==="UNDER"?"#ff4400":"#ffcc00";var sc=p.combined_score>=8.5?"#ffcc00":p.combined_score>=7.5?"#ff8800":"#ff4400";
h+='<div class="card" style="border-left:4px solid '+pc+'">';
h+='<span style="background:'+pc+'22;color:'+pc+';border:1px solid '+pc+';border-radius:5px;padding:2px 9px;font-size:10px;font-weight:900">'+p.pick+'</span> ';
h+='<span style="background:#ff220022;color:#ff4400;border:1px solid #ff440033;border-radius:5px;padding:2px 8px;font-size:9px;font-weight:700">'+p.blowout_risk+' BLOWOUT</span>';
h+='<div class="pname">'+p.player+'</div>';
h+='<div class="mtch">'+p.team+' vs '+p.opponent+' · '+p.game_time+'</div>';
h+='<div class="line"><span style="color:'+pc+'">'+p.pick+' </span><span style="color:#fff">'+p.line+'</span><span style="color:#3a2010;font-size:14px"> '+p.stat+'</span><span style="color:'+sc+';font-size:14px;float:right">'+p.combined_score.toFixed(1)+'/10</span></div>';
h+='<div class="why">'+p.reasoning+'</div>';
h+='<button class="cbtn" onclick="cp('+i+')">📋 Copy Pick</button></div>';});
document.getElementById("out").innerHTML=h;toast("🔥 "+d.top_props.length+" elite props found!");}
catch(e){document.getElementById("out").innerHTML='<div class="err">⚠️ '+e.message+'<br><button class="rbtn" onclick="go()">🔄 Try Again</button></div>';}
btn.disabled=false;btn.textContent="⚡ ANALYZE "+league+" PROPS";}
function cp(i){var p=props[i];try{navigator.clipboard.writeText(p.player+" "+p.pick+" "+p.line+" "+p.stat+" ("+p.team+" vs "+p.opponent+")");}catch(e){}toast("📋 "+p.player+" copied!");}
var tt;function toast(m){var t=document.getElementById("toast");t.textContent=m;t.style.opacity="1";clearTimeout(tt);tt=setTimeout(function(){t.style.opacity="0";},2800);}
</script></body></html>`));

app.listen(PORT, () => console.log("StatJunkie on port " + PORT));
