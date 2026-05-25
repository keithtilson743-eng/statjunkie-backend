const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
const GROQ_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT || 3000;
app.get("/health", (req, res) => res.json({ status: "running", groq: !!GROQ_KEY }));
app.post("/props", async (req, res) => {
  const { league } = req.body;
  if (!league) return res.status(400).json({ error: "league required" });
  if (!GROQ_KEY) return res.status(500).json({ error: "No API key" });
  const date = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
  const prompt = `Today is ${date}. League: ${league}. Give me 5 elite PrizePicks player props 8.0+ confidence. Return ONLY raw JSON: {"slate":"${league}","summary":"one sharp sentence","top_props":[{"player":"Full Name","team":"NYL","opponent":"PDX","stat":"Points","line":16.5,"pick":"UNDER","combined_score":8.75,"reasoning":"2 sharp sentences max","blowout_risk":"HIGH","game_time":"7:00 PM ET","season_avg":14.2,"last5_avg":11.4,"last10_avg":12.8,"last5":[11,14,9,12,11],"last10":[11,14,9,12,11,15,13,10,12,11]}]}`;
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + GROQ_KEY },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 3000, messages: [{ role: "user", content: prompt }] })
    });
    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message });
    const raw = (d.choices || [])[0]?.message?.content || "";
    const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
    if (s === -1) return res.status(500).json({ error: "No JSON returned" });
    const parsed = JSON.parse(raw.slice(s, e + 1));
    res.json(parsed);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get("/", (req, res) => res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>StatJunkie</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#030310;color:#fff;font-family:system-ui,sans-serif;padding-bottom:40px}button{font-family:inherit;cursor:pointer;border:none;outline:none}.hdr{background:#05051a;border-bottom:1px solid #0d0d35;padding:44px 16px 14px;position:sticky;top:0;z-index:100}.logo{font-size:26px;font-weight:900}.s{color:#fff}.j{background:linear-gradient(135deg,#0055ff,#00ccff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.ltabs{display:flex;gap:6px;overflow-x:auto;margin-top:10px}.ltab{padding:7px 16px;border-radius:8px;font-size:11px;font-weight:900;white-space:nowrap;background:#0a0a25;border:1px solid #0d0d35;color:#1a1a50}.ltab.on{background:linear-gradient(135deg,#0033cc,#0077ff);border-color:transparent;color:#fff}.body{padding:14px 16px;max-width:600px;margin:0 auto}.abtn{width:100%;padding:16px;background:linear-gradient(135deg,#0033cc,#0066ff,#0099ff);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:900;letter-spacing:1px;margin-bottom:16px;box-shadow:0 4px 28px #0055ff44}.abtn:disabled{background:#0a0a25;box-shadow:none}.sum{background:#05051a;border:1px solid #0d0d35;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:#4466aa;line-height:1.5}.card{background:#05051a;border:1px solid #0d0d35;border-radius:16px;margin-bottom:12px;overflow:hidden}.ctop{padding:14px 14px 10px}.badge{display:inline-block;border-radius:5px;padding:2px 8px;font-size:10px;font-weight:900;border:1px solid;margin-right:5px}.pname{font-size:19px;font-weight:900;color:#fff;margin:8px 0 2px}.mtch{font-size:11px;color:#1a1a50;margin-bottom:8px}.lrow{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.lmain{font-size:22px;font-weight:900}.lscore{font-size:22px;font-weight:900}.cbar{height:3px;background:#0a0a25;border-radius:2px;margin-bottom:10px}.cbarf{height:100%;border-radius:2px}.reason{font-size:13px;color:#4466aa;line-height:1.5}.stoggle{width:100%;padding:9px 14px;background:#080820;border-top:1px solid #0d0d35;color:#0066ff;font-size:11px;font-weight:800;letter-spacing:1px;text-align:left;display:flex;justify-content:space-between}.spanel{display:none;background:#04041a;border-top:1px solid #0d0d35;padding:12px 14px}.stabs{display:flex;gap:6px;margin-bottom:12px}.stab{padding:5px 12px;border-radius:8px;font-size:10px;font-weight:800;background:#05051a;border:1px solid #0d0d35;color:#1a1a50}.stab.on{background:#0055ff22;border-color:#0055ff;color:#0099ff}.sgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px}.sbox{background:#05051a;border:1px solid #0d0d35;border-radius:10px;padding:10px;text-align:center}.sval{font-size:18px;font-weight:900;color:#0099ff}.slbl{font-size:9px;color:#1a1a50;margin-top:2px;letter-spacing:1px}.bars{display:flex;gap:3px;align-items:flex-end;height:50px;margin:8px 0}.bbar{flex:1;border-radius:3px 3px 0 0;position:relative;min-height:4px}.bnum{position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:7px;color:#444;white-space:nowrap}.blbl{font-size:9px;color:#1a1a50;text-align:center;letter-spacing:1px}.cbtn{width:100%;padding:10px;background:#080820;border-top:1px solid #0d0d35;color:#2244aa;font-size:11px;font-weight:700}.err{background:#0a0a25;border:1px solid #003399;border-radius:12px;padding:14px;margin-bottom:14px;color:#4488ff;font-size:13px}.rbtn{margin-top:10px;background:#003399;border-radius:8px;color:#0099ff;padding:7px 14px;font-size:12px;font-weight:700;border:none}.toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#05051a;border:1px solid #0055ff33;border-radius:20px;padding:10px 20px;color:#0099ff;font-size:13px;font-weight:700;z-index:999;pointer-events:none;opacity:0;transition:opacity .3s;white-space:nowrap}@keyframes spin{to{transform:rotate(360deg)}}.sp{width:16px;height:16px;border:2px solid #0a0a25;border-top:2px solid #0099ff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px}</style></head><body>
<div class="hdr">
<div style="font-size:9px;color:#0055ff55;letter-spacing:3px;font-weight:700;margin-bottom:4px">PRIZEPICKS INTELLIGENCE</div>
<div style="display:flex;justify-content:space-between;align-items:center">
<div class="logo"><span class="s">STAT</span><span class="j">JUNKIE</span> 🎯</div>
<div style="display:flex;align-items:center;gap:5px;background:#0055ff11;border:1px solid #0055ff33;border-radius:20px;padding:4px 10px"><div style="width:5px;height:5px;border-radius:50%;background:#0099ff;box-shadow:0 0 6px #0099ff"></div><span style="font-size:10px;color:#0099ff;font-weight:700">LIVE</span></div>
</div>
<div class="ltabs" id="ltabs"></div>
</div>
<div class="body">
<button class="abtn" id="abtn" onclick="go()">⚡ ANALYZE WNBA PROPS</button>
<div id="out"></div>
</div>
<div class="toast" id="toast"></div>
<script>
var LEAGUES=["WNBA","NBA","MLB","NHL","NFL"],league="WNBA",props=[];
var ltabs=document.getElementById("ltabs");
LEAGUES.forEach(function(l){
var b=document.createElement("button");
b.className="ltab"+(l==="WNBA"?" on":"");
b.textContent=l;
b.onclick=function(){
league=l;
document.querySelectorAll(".ltab").forEach(function(x,i){x.className="ltab"+(LEAGUES[i]===l?" on":"");});
document.getElementById("abtn").textContent="⚡ ANALYZE "+l+" PROPS";
document.getElementById("out").innerHTML="";
};
ltabs.appendChild(b);
});
function go(){
var btn=document.getElementById("abtn");
btn.disabled=true;
btn.innerHTML='<span class="sp"></span>FINDING '+league+' PROPS...';
document.getElementById("out").innerHTML="";
fetch("/props",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({league:league})})
.then(function(r){return r.json();})
.then(function(d){
if(d.error)throw new Error(d.error);
if(!d.top_props||!d.top_props.length)throw new Error("No props returned");
props=d.top_props;
var h='<div class="sum">'+d.summary+"</div>";
d.top_props.forEach(function(p,i){
var pc=p.pick==="UNDER"?"#0066ff":"#00ccff";
var sc=p.combined_score>=8.5?"#00ccff":p.combined_score>=7.5?"#0099ff":"#0066ff";
var rc=p.blowout_risk==="HIGH"?"#ff4444":p.blowout_risk==="LOW"?"#00cc88":"#ffaa00";
h+='<div class="card" style="border-left:4px solid '+pc+'">';
h+='<div class="ctop">';
h+='<span class="badge" style="background:'+pc+'22;color:'+pc+';border-color:'+pc+'">'+p.pick+'</span>';
h+='<span class="badge" style="background:'+rc+'22;color:'+rc+';border-color:'+rc+'44">'+p.blowout_risk+' BLOWOUT</span>';
h+='<div class="pname">'+p.player+'</div>';
h+='<div class="mtch">'+p.team+' vs '+p.opponent+' · '+p.game_time+'</div>';
h+='<div class="lrow"><div class="lmain"><span style="color:'+pc+'">'+p.pick+' </span><span style="color:#fff">'+p.line+'</span><span style="color:#1a1a50;font-size:14px"> '+p.stat+'</span></div><div class="lscore" style="color:'+sc+'">'+p.combined_score.toFixed(1)+'/10</div></div>';
h+='<div class="cbar"><div class="cbarf" style="width:'+(p.combined_score*10)+'%;background:linear-gradient(90deg,#0033cc,'+sc+')"></div></div>';
h+='<div class="reason">'+p.reasoning+'</div></div>';
h+='<button class="stoggle" onclick="ts('+i+')"><span>📊 PLAYER STATS</span><span id="sa'+i+'">▼</span></button>';
h+='<div class="spanel" id="sp'+i+'">';
h+='<div class="stabs"><button class="stab on" onclick="ss('+i+',\'s\',this)">Season</button><button class="stab" onclick="ss('+i+',\'l10\',this)">Last 10</button><button class="stab" onclick="ss('+i+',\'l5\',this)">Last 5</button></div>';
h+='<div id="ss'+i+'">';
h+='<div class="sgrid">';
h+='<div class="sbox"><div class="sval">'+(p.season_avg||"--")+'</div><div class="slbl">SEASON AVG</div></div>';
h+='<div class="sbox"><div class="sval" style="color:'+(p.season_avg>p.line?"#ff4444":"#00cc88")+'">'+(p.season_avg>p.line?"OVER":"UNDER")+'</div><div class="slbl">VS LINE</div></div>';
h+='<div class="sbox"><div class="sval" style="color:'+rc+'">'+p.blowout_risk+'</div><div class="slbl">BLOWOUT</div></div>';
h+='</div></div>';
var g10=p.last10||[],mx10=Math.max.apply(null,g10)||1;
h+='<div id="sl10-'+i+'" style="display:none">';
h+='<div class="sgrid"><div class="sbox"><div class="sval">'+(p.last10_avg||"--")+'</div><div class="slbl">L10 AVG</div></div>';
h+='<div class="sbox"><div class="sval" style="color:'+(p.last10_avg>p.line?"#ff4444":"#00cc88")+'">'+(p.last10_avg>p.line?"OVER":"UNDER")+'</div><div class="slbl">TREND</div></div>';
h+='<div class="sbox"><div class="sval">'+g10.filter(function(x){return x<p.line;}).length+'/10</div><div class="slbl">UNDER RATE</div></div></div>';
h+='<div class="bars">';
g10.forEach(function(g){h+='<div class="bbar" style="height:'+Math.max((g/mx10)*100,8)+'%;background:'+(g<p.line?"#0066ff":"#ff4444")+'"><span class="bnum">'+g+'</span></div>';});
h+='</div><div class="blbl">LAST 10 · LINE '+p.line+'</div></div>';
var g5=p.last5||[],mx5=Math.max.apply(null,g5)||1;
h+='<div id="sl5-'+i+'" style="display:none">';
h+='<div class="sgrid"><div class="sbox"><div class="sval">'+(p.last5_avg||"--")+'</div><div class="slbl">L5 AVG</div></div>';
h+='<div class="sbox"><div class="sval" style="color:'+(p.last5_avg>p.line?"#ff4444":"#00cc88")+'">'+(p.last5_avg>p.line?"OVER":"UNDER")+'</div><div class="slbl">TREND</div></div>';
h+='<div class="sbox"><div class="sval">'+g5.filter(function(x){return x<p.line;}).length+'/5</div><div class="slbl">UNDER RATE</div></div></div>';
h+='<div class="bars">';
g5.forEach(function(g){h+='<div class="bbar" style="height:'+Math.max((g/mx5)*100,8)+'%;background:'+(g<p.line?"#0066ff":"#ff4444")+'"><span class="bnum">'+g+'</span></div>';});
h+='</div><div class="blbl">LAST 5 · LINE '+p.line+'</div></div>';
h+='</div>';
h+='<button class="cbtn" onclick="cp('+i+')">📋 Copy Pick</button></div>';
});
document.getElementById("out").innerHTML=h;
toast("🔥 "+d.top_props.length+" props found!");
})
.catch(function(e){
document.getElementById("out").innerHTML='<div class="err">⚠️ '+e.message+'<br><button class="rbtn" onclick="go()">🔄 Try Again</button></div>';
})
.finally(function(){
btn.disabled=false;
btn.textContent="⚡ ANALYZE "+league+" PROPS";
});
}
function ts(i){var p=document.getElementById("sp"+i),a=document.getElementById("sa"+i);if(p.style.display==="block"){p.style.display="none";a.textContent="▼";}else{p.style.display="block";a.textContent="▲";}}
function ss(i,tab,btn){
document.getElementById("ss"+i).style.display=tab==="s"?"block":"none";
document.getElementById("sl10-"+i).style.display=tab==="l10"?"block":"none";
document.getElementById("sl5-"+i).style.display=tab==="l5"?"block":"none";
btn.closest(".spanel").querySelectorAll(".stab").forEach(function(b){b.className="stab";});
btn.className="stab on";
}
function cp(i){var p=props[i];try{navigator.clipboard.writeText(p.player+" "+p.pick+" "+p.line+" "+p.stat);}catch(e){}toast("📋 Copied!");}
var tt;function toast(m){var t=document.getElementById("toast");t.textContent=m;t.style.opacity="1";clearTimeout(tt);tt=setTimeout(function(){t.style.opacity="0";},2800);}
</script></body></html>`));
app.listen(PORT, () => console.log("StatJunkie on port " + PORT));
