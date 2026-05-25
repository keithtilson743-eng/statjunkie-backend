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
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
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
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#030310;color:#fff;font-family:system-ui,sans-serif}
button{font-family:inherit;cursor:pointer;border:none}
.hdr{background:linear-gradient(180deg,#05051a,#030310);border-bottom:1px solid #0a0a30;padding:50px 16px 12px;position:sticky;top:0;z-index:100}
.logo{font-size:28px;font-weight:900}
.s{color:#fff}
.j{background:linear-gradient(135deg,#0066ff,#0099ff,#00ccff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.tabs{display:flex;gap:6px;overflow-x:auto;margin-top:10px}
.tab{padding:6px 14px;border-radius:8px;font-size:11px;font-weight:900;white-space:nowrap;border:1px solid #0a0a30;background:#05051a;color:#1a1a50}
.tab.on{background:linear-gradient(135deg,#0044cc,#0088ff);border-color:transparent;color:#fff}
.body{padding:14px 16px;max-width:600px;margin:0 auto;padding-bottom:40px}
.abtn{width:100%;padding:16px;background:linear-gradient(135deg,#0033aa,#0066ff,#0099ff);border-radius:14px;color:#fff;font-size:15px;font-weight:900;letter-spacing:1px;margin-bottom:16px;box-shadow:0 4px 28px #0066ff44}
.abtn:disabled{background:#0a0a2a;box-shadow:none}
.yt-wrap{border-radius:16px;overflow:hidden;border:1px solid #0a0a30;background:#05051a;margin-bottom:16px}
.yt-inner{padding-bottom:56.25%;position:relative;height:0}
.yt-inner iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}
.yt-label{font-size:9px;color:#0066ff88;letter-spacing:2px;font-weight:700;padding:10px 14px 0}
.sum{background:#05051a;border:1px solid #0a0a30;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:#4466aa;line-height:1.6}
.card{background:#05051a;border:1px solid #0a0a30;border-radius:16px;padding:14px;margin-bottom:12px}
.pname{font-size:19px;font-weight:900;color:#fff;margin:8px 0 2px}
.mtch{font-size:11px;color:#1a1a50;margin-bottom:8px}
.line{font-size:22px;font-weight:900;margin-bottom:8px}
.why{font-size:13px;color:#4466aa;line-height:1.6;margin-bottom:10px}
.cbtn{padding:9px 14px;background:#0a0a2a;border:1px solid #1a1a40;border-radius:8px;color:#2244aa;font-size:11px;font-weight:700;width:100%}
.err{background:#0a0a2a;border:1px solid #0033ff33;border-radius:12px;padding:14px;margin-bottom:14px;color:#4488ff;font-size:13px;line-height:1.6}
.rbtn{margin-top:10px;background:#0033ff22;border:1px solid #0066ff;border-radius:8px;color:#0099ff;padding:7px 14px;font-size:12px;font-weight:700}
.toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#05051a;border:1px solid #0066ff33;border-radius:20px;padding:10px 20px;color:#0099ff;font-size:13px;font-weight:700;z-index:999;pointer-events:none;transition:opacity .3s;white-space:nowrap}
.live-badge{display:inline-flex;align-items:center;gap:5px;background:#0066ff11;border:1px solid #0066ff33;border-radius:20px;padding:4px 10px;margin-top:6px}
.live-dot{width:6px;height:6px;border-radius:50%;background:#0099ff;box-shadow:0 0 8px #0099ff;animation:pulse 2s infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.sp{width:18px;height:18px;border:2px solid #0a0a2a;border-top:2px solid #0099ff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px}
</style></head><body>
<div class="hdr">
  <div style="font-size:9px;color:#0066ff55;letter-spacing:3px;font-weight:700">PRIZEPICKS INTELLIGENCE</div>
  <div class="logo"><span class="s">STAT</span><span class="j">JUNKIE</span> 🎯</div>
  <div class="live-badge"><div class="live-dot"></div><span style="font-size:10px;color:#0099ff;font-weight:700">LIVE</span></div>
  <div class="tabs" id="tabs"></div>
</div>
<div class="body">

  <!-- YouTube Highlights shown by default, hidden after analyze -->
  <div id="ytSection">
    <div class="yt-label">🎬 LIVE HIGHLIGHTS</div>
    <div class="yt-wrap">
      <div class="yt-inner">
        <iframe id="ytFrame"
          src="https://www.youtube.com/embed?listType=search&list=WNBA+best+plays+2025&autoplay=1&mute=0&modestbranding=1&rel=0"
          allowfullscreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
        </iframe>
      </div>
    </div>
    <div style="display:flex;gap:6px;overflow-x:auto;margin-top:8px;margin-bottom:14px" id="ytTabs"></div>
  </div>

  <button class="abtn" id="abtn" onclick="go()">⚡ ANALYZE WNBA PROPS</button>
  <div id="out"></div>
</div>
<div class="toast" id="toast" style="opacity:0"></div>
<script>
var L=["WNBA","NBA","MLB","NHL","NFL"],league="WNBA",props=[],tabs=document.getElementById("tabs");
var YT={
  WNBA:["WNBA best plays 2025","WNBA highlights today","Caitlin Clark highlights 2025"],
  NBA:["NBA best dunks 2025","NBA highlights today","NBA top plays 2025"],
  MLB:["MLB highlights today","MLB home runs 2025","MLB best plays 2025"],
  NHL:["NHL goals 2025","NHL highlights today","NHL best saves 2025"],
  NFL:["NFL best plays 2025","NFL touchdowns 2025","NFL highlights 2025"]
};

function updateYT(l){
  var searches=YT[l]||YT.WNBA;
  document.getElementById("ytFrame").src="https://www.youtube.com/embed?listType=search&list="+encodeURIComponent(searches[0])+"&autoplay=1&mute=0&modestbranding=1&rel=0";
  var ytTabs=document.getElementById("ytTabs");
  ytTabs.innerHTML="";
  searches.forEach(function(s,i){
    var b=document.createElement("button");
    b.textContent=s;
    b.style.cssText="padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap;background:"+(i===0?"#0066ff22":"#05051a")+";border:1px solid "+(i===0?"#0066ff":"#0a0a30")+";color:"+(i===0?"#0099ff":"#1a1a50")+";cursor:pointer";
    b.onclick=function(){
      document.getElementById("ytFrame").src="https://www.youtube.com/embed?listType=search&list="+encodeURIComponent(s)+"&autoplay=1&mute=0&modestbranding=1&rel=0";
      document.querySelectorAll("#ytTabs button").forEach(function(x,j){
        x.style.background=j===i?"#0066ff22":"#05051a";
        x.style.borderColor=j===i?"#0066ff":"#0a0a30";
        x.style.color=j===i?"#0099ff":"#1a1a50";
      });
    };
    ytTabs.appendChild(b);
  });
}

L.forEach(function(l){
  var b=document.createElement("button");
  b.className="tab"+(l==="WNBA"?" on":"");
  b.textContent=l;
  b.onclick=function(){
    league=l;
    document.querySelectorAll(".tab").forEach(function(x,i){x.className="tab"+(L[i]===l?" on":"");});
    document.getElementById("abtn").textContent="⚡ ANALYZE "+l+" PROPS";
    document.getElementById("out").innerHTML="";
    updateYT(l);
    document.getElementById("ytSection").style.display="block";
  };
  tabs.appendChild(b);
});

updateYT("WNBA");

async function go(){
  var btn=document.getElementById("abtn");
  btn.disabled=true;
  btn.innerHTML='<span class="sp"></span>FINDING '+league+' PROPS...';
  document.getElementById("out").innerHTML="";
  // Hide highlights when analyzing
  document.getElementById("ytSection").style.display="none";
  try{
    var r=await fetch("/props",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({league:league})});
    var d=await r.json();
    if(d.error)throw new Error(d.error);
    if(!d.top_props||!d.top_props.length)throw new Error("No props returned");
    props=d.top_props;
    var h='<div class="sum">'+d.summary+"</div>";
    d.top_props.forEach(function(p,i){
      var pc=p.pick==="UNDER"?"#0066ff":"#00ccff";
      var sc=p.combined_score>=8.5?"#00ccff":p.combined_score>=7.5?"#0099ff":"#0066ff";
      var rc=p.blowout_risk==="HIGH"?"#ff4444":p.blowout_risk==="LOW"?"#00cc88":"#ffaa00";
      h+='<div class="card" style="border-left:4px solid '+pc+'">';
      h+='<span style="background:'+pc+'22;color:'+pc+';border:1px solid '+pc+';border-radius:5px;padding:2px 9px;font-size:10px;font-weight:900">'+p.pick+'</span> ';
      h+='<span style="background:'+rc+'22;color:'+rc+';border:1px solid '+rc+'44;border-radius:5px;padding:2px 8px;font-size:9px;font-weight:700">'+p.blowout_risk+' BLOWOUT</span>';
      h+='<div class="pname">'+p.player+'</div>';
      h+='<div class="mtch">'+p.team+' vs '+p.opponent+' · '+p.game_time+'</div>';
      h+='<div class="line"><span style="color:'+pc+'">'+p.pick+' </span><span style="color:#fff">'+p.line+'</span><span style="color:#1a1a50;font-size:14px"> '+p.stat+'</span><span style="color:'+sc+';font-size:14px;float:right">'+p.combined_score.toFixed(1)+'/10</span></div>';
      h+='<div style="height:3px;background:#0a0a2a;border-radius:2px;margin:8px 0"><div style="height:100%;width:'+(p.combined_score*10)+'%;background:linear-gradient(90deg,#0044cc,'+sc+');border-radius:2px"></div></div>';
      h+='<div class="why">'+p.reasoning+'</div>';
      h+='<button class="cbtn" onclick="cp('+i+')">📋 Copy Pick</button></div>';
    });
    // Show highlights at bottom after props
    h+='<div style="margin-top:20px"><div class="yt-label" style="margin-bottom:8px">🎬 '+league+' HIGHLIGHTS</div><div class="yt-wrap"><div class="yt-inner"><iframe src="https://www.youtube.com/embed?listType=search&list='+encodeURIComponent(league+' best plays 2025')+'&autoplay=0&modestbranding=1&rel=0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div></div></div>';
    document.getElementById("out").innerHTML=h;
    toast("🔥 "+d.top_props.length+" elite props found!");
  } catch(e){
    document.getElementById("ytSection").style.display="block";
    document.getElementById("out").innerHTML='<div class="err">⚠️ '+e.message+'<br><button class="rbtn" onclick="go()">🔄 Try Again</button></div>';
  }
  btn.disabled=false;
  btn.textContent="⚡ ANALYZE "+league+" PROPS";
}

function cp(i){
  var p=props[i];
  try{navigator.clipboard.writeText(p.player+" "+p.pick+" "+p.line+" "+p.stat+" ("+p.team+" vs "+p.opponent+")");}catch(e){}
  toast("📋 "+p.player+" copied!");
}

var tt;function toast(m){var t=document.getElementById("toast");t.textContent=m;t.style.opacity="1";clearTimeout(tt);tt=setTimeout(function(){t.style.opacity="0";},2800);}
</script></body></html>`));

app.listen(PORT, () => console.log("StatJunkie on port " + PORT));
