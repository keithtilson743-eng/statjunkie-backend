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
  if (!GROQ_KEY) return res.status(500).json({ error: "GROQ_API_KEY not set" });

  const date = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
  const prompt = `Today is ${date}. League: ${league}. You are a sharp sports betting analyst. Give me 5 elite PrizePicks player props with 8.0+ confidence. Return ONLY raw JSON starting with { ending with }. {"slate":"${league}","date":"${date}","summary":"One sharp sentence about today","best_lineup":["Player UNDER 16.5 Points"],"top_props":[{"player":"Full Name","team":"NYL","opponent":"PDX","stat":"Points","line":16.5,"pick":"UNDER","combined_score":8.75,"reasoning":"Max 2 sharp sentences.","blowout_risk":"HIGH","game_time":"7:00 PM ET","stats":{"season_avg":14.2,"last5_avg":11.4,"last10_avg":12.8,"last5_games":[11,14,9,12,11],"last10_games":[11,14,9,12,11,15,13,10,12,11],"vs_opponent_avg":12.1,"home_away":"Away","team_win_pct":0.72}}]}`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 4000, temperature: 0.7, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) { const t = await r.text(); return res.status(500).json({ error: "Groq error: " + t.slice(0,200) }); }
    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message });
    const raw = d.choices?.[0]?.message?.content || "";
    if (!raw) return res.status(500).json({ error: "Empty response" });
    const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
    if (s === -1 || e === -1) return res.status(500).json({ error: "No JSON found" });
    const parsed = JSON.parse(raw.slice(s, e + 1));
    if (!Array.isArray(parsed.top_props) || !parsed.top_props.length) return res.status(500).json({ error: "No props in response" });
    res.json(parsed);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/", (req, res) => res.send(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>StatJunkie</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#030310;color:#fff;font-family:system-ui,sans-serif}
button{font-family:inherit;cursor:pointer;border:none;outline:none}
.hdr{background:linear-gradient(180deg,#05051a,#030310);border-bottom:1px solid #0d0d35;padding:50px 16px 12px;position:sticky;top:0;z-index:100}
.logo{font-size:28px;font-weight:900;line-height:1}
.s{color:#fff}.j{background:linear-gradient(135deg,#0055ff,#0099ff,#00ccff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sub{font-size:9px;color:#0055ff55;letter-spacing:3px;font-weight:700;margin-bottom:4px}
.live{display:inline-flex;align-items:center;gap:5px;background:#0055ff11;border:1px solid #0055ff33;border-radius:20px;padding:3px 10px;margin-top:6px}
.ldot{width:5px;height:5px;border-radius:50%;background:#0099ff;animation:pulse 2s infinite;box-shadow:0 0 6px #0099ff}
.tabs{display:flex;gap:6px;overflow-x:auto;margin-top:10px;padding-bottom:2px}
.tab{padding:6px 14px;border-radius:8px;font-size:11px;font-weight:900;white-space:nowrap;border:1px solid #0d0d35;background:#05051a;color:#1a1a50}
.tab.on{background:linear-gradient(135deg,#0033cc,#0077ff);border-color:transparent;color:#fff}
.body{padding:14px 16px;max-width:600px;margin:0 auto;padding-bottom:60px}
.yt-section{margin-bottom:16px}
.yt-label{font-size:9px;color:#0055ff88;letter-spacing:2px;font-weight:700;margin-bottom:8px}
.yt-wrap{border-radius:14px;overflow:hidden;border:1px solid #0d0d35;background:#05051a}
.yt-inner{padding-bottom:56.25%;position:relative;height:0}
.yt-inner iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}
.yt-btns{display:flex;gap:6px;margin-top:8px;overflow-x:auto}
.yt-btn{padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap;background:#05051a;border:1px solid #0d0d35;color:#1a1a50}
.yt-btn.on{background:#0055ff22;border-color:#0055ff;color:#0099ff}
.abtn{width:100%;padding:16px;background:linear-gradient(135deg,#0033cc,#0066ff,#0099ff);border-radius:14px;color:#fff;font-size:15px;font-weight:900;letter-spacing:1px;margin-bottom:16px;box-shadow:0 4px 28px #0066ff44;position:relative;overflow:hidden}
.abtn:disabled{background:#0a0a2a;box-shadow:none}
.abtn::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,#ffffff15,transparent);transform:skewX(-20deg) translateX(-100%);animation:shimmer 2.5s infinite}
.abtn:disabled::before{display:none}
.sum{background:#05051a;border:1px solid #0d0d35;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:#4466aa;line-height:1.5}
.card{background:#05051a;border:1px solid #0d0d35;border-radius:16px;margin-bottom:12px;overflow:hidden}
.card-top{padding:14px 14px 0}
.pick-badge{display:inline-block;border-radius:5px;padding:2px 9px;font-size:10px;font-weight:900;border:1px solid}
.risk-badge{display:inline-block;border-radius:5px;padding:2px 8px;font-size:9px;font-weight:700;border:1px solid;margin-left:5px}
.pname{font-size:19px;font-weight:900;color:#fff;margin:8px 0 2px}
.mtch{font-size:11px;color:#1a1a50;margin-bottom:6px}
.line-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.line-main{font-size:22px;font-weight:900}
.score-badge{font-size:22px;font-weight:900}
.conf-bar{height:3px;background:#0a0a2a;border-radius:2px;margin-bottom:10px}
.conf-fill{height:100%;border-radius:2px}
.reason{font-size:13px;color:#4466aa;line-height:1.5;padding:0 0 10px}
.stats-toggle{width:100%;padding:9px 14px;background:#08082a;border-top:1px solid #0d0d35;color:#0066ff;font-size:11px;font-weight:800;letter-spacing:1px;text-align:left;display:flex;justify-content:space-between;align-items:center}
.stats-panel{background:#04041a;border-top:1px solid #0d0d35;padding:12px 14px;display:none}
.stats-tabs{display:flex;gap:6px;margin-bottom:12px}
.stab{padding:5px 12px;border-radius:8px;font-size:10px;font-weight:800;background:#05051a;border:1px solid #0d0d35;color:#1a1a50}
.stab.on{background:#0055ff22;border-color:#0055ff;color:#0099ff}
.stat-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px}
.stat-box{background:#05051a;border:1px solid #0d0d35;border-radius:10px;padding:10px;text-align:center}
.stat-val{font-size:20px;font-weight:900;color:#0099ff}
.stat-lbl{font-size:9px;color:#1a1a50;margin-top:2px;letter-spacing:1px}
.games-row{display:flex;gap:4px;align-items:flex-end;height:48px;margin-bottom:8px}
.cbtn{width:100%;padding:10px;background:#08082a;border-top:1px solid #0d0d35;color:#2244aa;font-size:11px;font-weight:700}
.err{background:#0a0a2a;border:1px solid #0033ff33;border-radius:12px;padding:14px;margin-bottom:14px;color:#4488ff;font-size:13px;line-height:1.6}
.rbtn{margin-top:10px;background:#0033ff22;border:1px solid #0066ff;border-radius:8px;color:#0099ff;padding:7px 14px;font-size:12px;font-weight:700}
.toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#05051a;border:1px solid #0066ff33;border-radius:20px;padding:10px 20px;color:#0099ff;font-size:13px;font-weight:700;z-index:999;pointer-events:none;transition:opacity .3s;white-space:nowrap}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes shimmer{0%{transform:skewX(-20deg) translateX(-200%)}100%{transform:skewX(-20deg) translateX(300%)}}
.sp{width:18px;height:18px;border:2px solid #0a0a2a;border-top:2px solid #0099ff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px}
</style>
</head><body>
<div class="hdr">
  <div class="sub">PRIZEPICKS INTELLIGENCE</div>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div class="logo"><span class="s">STAT</span><span class="j">JUNKIE</span> 🎯</div>
    <div class="live"><div class="ldot"></div><span style="font-size:10px;color:#0099ff;font-weight:700">LIVE</span></div>
  </div>
  <div class="tabs" id="tabs"></div>
</div>
<div class="body">
  <div class="yt-section" id="ytSection">
    <div class="yt-label" id="ytLabel">🎬 WNBA HIGHLIGHTS</div>
    <div class="yt-wrap">
      <div class="yt-inner">
        <iframe id="ytFrame" src="https://www.youtube.com/embed/PLybJcDRaQhY?rel=0&modestbranding=1" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
      </div>
    </div>
    <div class="yt-btns" id="ytBtns"></div>
  </div>
  <button class="abtn" id="abtn" onclick="go()">⚡ ANALYZE WNBA PROPS</button>
  <div id="out"></div>
</div>
<div class="toast" id="toast" style="opacity:0"></div>
<script>
var L=["WNBA","NBA","MLB","NHL","NFL"],league="WNBA",props=[];

// Real YouTube playlist IDs and video IDs for sports highlights
var YT={
  WNBA:[
    {id:"PLybJcDRaQhY",t:"Top Plays",pl:true},
    {id:"8Weq9a65PoE",t:"Best Moments",pl:false},
    {id:"ZS-GmRSBPpQ",t:"Game Highlights",pl:false}
  ],
  NBA:[
    {id:"PLlVlyGVtvuVnMbkO2kNrY8yULLhYhKB5q",t:"Top Plays",pl:true},
    {id:"wYjp9zoqQrs",t:"Best Dunks",pl:false},
    {id:"B5KkiGDFMaE",t:"Highlights",pl:false}
  ],
  MLB:[
    {id:"PLlVlyGVtvuVm3pXf3IaHUuX3dkCIAnlOR",t:"Top Plays",pl:true},
    {id:"AqbBJnhgX9Q",t:"Home Runs",pl:false},
    {id:"BgtE8XDAToE",t:"Highlights",pl:false}
  ],
  NHL:[
    {id:"PLlVlyGVtvuVmMv_bMhLOjQZRW1MEFNGm0",t:"Goals",pl:true},
    {id:"gqOyHFTKzHs",t:"Top Saves",pl:false},
    {id:"4EFVqwTBwmU",t:"Highlights",pl:false}
  ],
  NFL:[
    {id:"PLlVlyGVtvuVkbrBWHFrFNqkr7-6mRBhSj",t:"Top Plays",pl:true},
    {id:"TaGTRmFOIzA",t:"Touchdowns",pl:false},
    {id:"GxLFkNHVnMU",t:"Highlights",pl:false}
  ]
};

function getEmbedUrl(v) {
  if(v.pl) return "https://www.youtube.com/embed/videoseries?list="+v.id+"&rel=0&modestbranding=1";
  return "https://www.youtube.com/embed/"+v.id+"?rel=0&modestbranding=1";
}

function loadYT(l,idx){
  idx=idx||0;
  var vids=YT[l]||YT.WNBA;
  document.getElementById("ytFrame").src=getEmbedUrl(vids[idx]);
  document.getElementById("ytLabel").textContent="🎬 "+l+" HIGHLIGHTS";
  var btns=document.getElementById("ytBtns");btns.innerHTML="";
  vids.forEach(function(v,i){
    var b=document.createElement("button");
    b.className="yt-btn"+(i===idx?" on":"");
    b.textContent=v.t;
    b.onclick=function(){
      document.getElementById("ytFrame").src=getEmbedUrl(v);
      document.querySelectorAll(".yt-btn").forEach(function(x,j){x.className="yt-btn"+(j===i?" on":"");});
    };
    btns.appendChild(b);
  });
}

// Init league tabs
var tabs=document.getElementById("tabs");
L.forEach(function(l){
  var b=document.createElement("button");
  b.className="tab"+(l==="WNBA"?" on":"");
  b.textContent=l;
  b.onclick=function(){
    league=l;
    document.querySelectorAll(".tab").forEach(function(x,i){x.className="tab"+(L[i]===l?" on":"");});
    document.getElementById("abtn").textContent="⚡ ANALYZE "+l+" PROPS";
    document.getElementById("out").innerHTML="";
    loadYT(l,0);
    document.getElementById("ytSection").style.display="block";
  };
  tabs.appendChild(b);
});
loadYT("WNBA",0);

async function go(){
  var btn=document.getElementById("abtn");
  btn.disabled=true;
  btn.innerHTML='<span class="sp"></span>FINDING '+league+' PROPS...';
  document.getElementById("out").innerHTML="";
  document.getElementById("ytSection").style.display="none";
  try{
    var r=await fetch("/props",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({league:league})});
    var d=await r.json();
    if(d.error)throw new Error(d.error);
    if(!d.top_props||!d.top_props.length)throw new Error("No props returned");
    props=d.top_props;
    var h='<div class="sum">'+d.summary+'</div>';
    d.top_props.forEach(function(p,i){
      var pc=p.pick==="UNDER"?"#0066ff":"#00ccff";
      var sc=p.combined_score>=8.5?"#00ccff":p.combined_score>=7.5?"#0099ff":"#0066ff";
      var rc=p.blowout_risk==="HIGH"?"#ff4444":p.blowout_risk==="LOW"?"#00cc88":"#ffaa00";
      var st=p.stats||{};
      h+='<div class="card" style="border-left:4px solid '+pc+'">';
      h+='<div class="card-top">';
      h+='<span class="pick-badge" style="background:'+pc+'22;color:'+pc+';border-color:'+pc+'">'+p.pick+'</span>';
      h+='<span class="risk-badge" style="background:'+rc+'22;color:'+rc+';border-color:'+rc+'44">'+p.blowout_risk+' BLOWOUT</span>';
      h+='<div class="pname">'+p.player+'</div>';
      h+='<div class="mtch">'+p.team+' vs '+p.opponent+' · '+p.game_time+'</div>';
      h+='<div class="line-row"><div class="line-main"><span style="color:'+pc+'">'+p.pick+' </span><span style="color:#fff">'+p.line+'</span><span style="color:#1a1a50;font-size:14px"> '+p.stat+'</span></div>';
      h+='<div class="score-badge" style="color:'+sc+'">'+p.combined_score.toFixed(1)+'/10</div></div>';
      h+='<div class="conf-bar"><div class="conf-fill" style="width:'+(p.combined_score*10)+'%;background:linear-gradient(90deg,#0033cc,'+sc+')"></div></div>';
      h+='<div class="reason">'+p.reasoning+'</div></div>';
      h+='<button class="stats-toggle" onclick="toggleStats('+i+')"><span>📊 VIEW PLAYER STATS</span><span id="sarr'+i+'">▼</span></button>';
      h+='<div class="stats-panel" id="sp'+i+'">';
      h+='<div class="stats-tabs"><button class="stab on" onclick="showStat('+i+',\'season\',this)">Full Season</button><button class="stab" onclick="showStat('+i+',\'last10\',this)">Last 10</button><button class="stab" onclick="showStat('+i+',\'last5\',this)">Last 5</button></div>';
      h+='<div id="stat-season-'+i+'">';
      h+='<div class="stat-grid">';
      h+='<div class="stat-box"><div class="stat-val">'+(st.season_avg||"--")+'</div><div class="stat-lbl">SEASON AVG</div></div>';
      h+='<div class="stat-box"><div class="stat-val" style="color:'+(st.season_avg>p.line?"#ff4444":"#00cc88")+'">'+(st.season_avg>p.line?"OVER":"UNDER")+'</div><div class="stat-lbl">VS LINE</div></div>';
      h+='<div class="stat-box"><div class="stat-val">'+(st.vs_opponent_avg||"--")+'</div><div class="stat-lbl">VS OPP</div></div>';
      h+='<div class="stat-box"><div class="stat-val">'+(st.home_away||"--")+'</div><div class="stat-lbl">HOME/AWAY</div></div>';
      h+='<div class="stat-box"><div class="stat-val">'+Math.round((st.team_win_pct||0)*100)+'%</div><div class="stat-lbl">TEAM WIN%</div></div>';
      h+='<div class="stat-box"><div class="stat-val" style="color:'+rc+'">'+p.blowout_risk+'</div><div class="stat-lbl">BLOWOUT</div></div>';
      h+='</div></div>';
      var g10=st.last10_games||[0,0,0,0,0,0,0,0,0,0];var max10=Math.max.apply(null,g10)||1;
      h+='<div id="stat-last10-'+i+'" style="display:none">';
      h+='<div class="stat-grid"><div class="stat-box"><div class="stat-val">'+(st.last10_avg||"--")+'</div><div class="stat-lbl">L10 AVG</div></div>';
      h+='<div class="stat-box"><div class="stat-val" style="color:'+(st.last10_avg>p.line?"#ff4444":"#00cc88")+'">'+(st.last10_avg>p.line?"OVER":"UNDER")+'</div><div class="stat-lbl">TREND</div></div>';
      h+='<div class="stat-box"><div class="stat-val">'+g10.filter(function(x){return x<p.line;}).length+'/10</div><div class="stat-lbl">UNDER RATE</div></div></div>';
      h+='<div class="games-row">';
      g10.forEach(function(g){var col=g<p.line?"#0066ff":"#ff4444";var pct=(g/max10)*100;h+='<div style="flex:1;height:'+Math.max(pct,8)+'%;background:'+col+';border-radius:3px 3px 0 0;position:relative"><span style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:7px;color:#555">'+g+'</span></div>';});
      h+='</div><div style="font-size:9px;color:#1a1a50;text-align:center;margin-top:4px">LAST 10 GAMES · LINE: '+p.line+'</div></div>';
      var g5=st.last5_games||[0,0,0,0,0];var max5=Math.max.apply(null,g5)||1;
      h+='<div id="stat-last5-'+i+'" style="display:none">';
      h+='<div class="stat-grid"><div class="stat-box"><div class="stat-val">'+(st.last5_avg||"--")+'</div><div class="stat-lbl">L5 AVG</div></div>';
      h+='<div class="stat-box"><div class="stat-val" style="color:'+(st.last5_avg>p.line?"#ff4444":"#00cc88")+'">'+(st.last5_avg>p.line?"OVER":"UNDER")+'</div><div class="stat-lbl">TREND</div></div>';
      h+='<div class="stat-box"><div class="stat-val">'+g5.filter(function(x){return x<p.line;}).length+'/5</div><div class="stat-lbl">UNDER RATE</div></div></div>';
      h+='<div class="games-row">';
      g5.forEach(function(g){var col=g<p.line?"#0066ff":"#ff4444";var pct=(g/max5)*100;h+='<div style="flex:1;height:'+Math.max(pct,8)+'%;background:'+col+';border-radius:3px 3px 0 0;position:relative"><span style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:9px;color:#888">'+g+'</span></div>';});
      h+='</div><div style="font-size:9px;color:#1a1a50;text-align:center;margin-top:4px">LAST 5 GAMES · LINE: '+p.line+'</div></div>';
      h+='</div>';
      h+='<button class="cbtn" onclick="cp('+i+')">📋 Copy Pick</button></div>';
    });
    // Show highlights at bottom
    var firstVid=YT[league]||YT.WNBA;
    h+='<div style="margin-top:20px"><div class="yt-label">🎬 '+league+' HIGHLIGHTS</div><div class="yt-wrap"><div class="yt-inner"><iframe src="'+getEmbedUrl(firstVid[0])+'" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div></div></div>';
    document.getElementById("out").innerHTML=h;
    toast("🔥 "+d.top_props.length+" elite props found!");
  }catch(e){
    document.getElementById("ytSection").style.display="block";
    document.getElementById("out").innerHTML='<div class="err">⚠️ '+e.message+'<br><button class="rbtn" onclick="go()">🔄 Try Again</button></div>';
  }
  btn.disabled=false;
  btn.textContent="⚡ ANALYZE "+league+" PROPS";
}

function toggleStats(i){
  var p=document.getElementById("sp"+i),a=document.getElementById("sarr"+i);
  if(p.style.display==="block"){p.style.display="none";a.textContent="▼";}
  else{p.style.display="block";a.textContent="▲";}
}

function showStat(i,tab,btn){
  ["season","last10","last5"].forEach(function(t){document.getElementById("stat-"+t+"-"+i).style.display=t===tab?"block":"none";});
  btn.closest(".stats-panel").querySelectorAll(".stab").forEach(function(b){b.className="stab";});
  btn.className="stab on";
}

function cp(i){
  var p=props[i];
  try{navigator.clipboard.writeText(p.player+" "+p.pick+" "+p.line+" "+p.stat+" ("+p.team+" vs "+p.opponent+")");}catch(e){}
  toast("📋 "+p.player+" copied!");
}

var tt;function toast(m){var t=document.getElementById("toast");t.textContent=m;t.style.opacity="1";clearTimeout(tt);tt=setTimeout(function(){t.style.opacity="0";},2800);}
</script></body></html>`));

app.listen(PORT, () => console.log("StatJunkie on port " + PORT));
