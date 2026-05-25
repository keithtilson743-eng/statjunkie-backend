const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
const API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => res.json({ status: "running" }));

app.post("/props", async (req, res) => {
  const { league } = req.body;
  if (!league) return res.status(400).json({ error: "league required" });
  const date = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
  const prompt = `Today is ${date}. League: ${league}. Give me 5 elite PrizePicks player props 8.0+ confidence. Return ONLY raw JSON starting with { ending with }. {"slate":"${league}","date":"${date}","summary":"sharp sentence","best_lineup":["Player UNDER 16.5 Points"],"top_props":[{"player":"Full Name","team":"NYL","opponent":"PDX","stat":"Points","line":16.5,"pick":"UNDER","edge_score":8.5,"confidence":9.0,"combined_score":8.75,"reasoning":"3-4 sharp sentences","blowout_risk":"HIGH","game_time":"7:00 PM ET","risk_factors":[{"factor":"Blowout Risk","level":"HIGH","detail":"88% favourite"},{"factor":"Minutes Risk","level":"HIGH","detail":"Pulled in Q4"},{"factor":"Recent Form","level":"LOW","detail":"11,11,14 last 3"}]}]}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type":"application/json", "x-api-key":API_KEY, "anthropic-version":"2023-06-01" },
      body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:4000, messages:[{ role:"user", content:prompt }] }),
    });
    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message });
    const raw = (d.content||[]).map(b=>b.text||"").join("").trim();
    const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
    if (s===-1||e===-1) return res.status(500).json({ error:"No JSON" });
    res.json(JSON.parse(raw.slice(s,e+1)));
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get("/", (req, res) => res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>StatJunkie</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#050505;color:#fff;font-family:system-ui,sans-serif}button{font-family:inherit;cursor:pointer}.header{background:#0d0500;border-bottom:1px solid #1a0800;padding:50px 16px 12px;position:sticky;top:0;z-index:100}.logo{font-size:28px;font-weight:900}.logo .s{color:#fff}.logo .j{background:linear-gradient(135deg,#ff4400,#ff8800,#ffcc00);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.tabs{display:flex;gap:6px;overflow-x:auto;margin-top:12px}.tab{padding:6px 14px;border-radius:8px;font-size:11px;font-weight:900;white-space:nowrap;border:1px solid #1a0800;background:#0d0500;color:#3a2010}.tab.active{background:linear-gradient(135deg,#cc2200,#ff6600);border-color:transparent;color:#fff}.content{padding:14px 16px;max-width:600px;margin:0 auto}.btn{width:100%;padding:16px;background:linear-gradient(135deg,#cc2200,#ff4400,#ff8800);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:900;letter-spacing:1px;margin-bottom:16px;box-shadow:0 4px 28px #ff440044}.btn:disabled{background:#1a0800;box-shadow:none}.card{background:#0d0500;border:1px solid #1a0800;border-radius:16px;padding:16px;margin-bottom:14px}.card-name{font-size:18px;font-weight:900;color:#fff;margin-bottom:4px}.card-matchup{font-size:11px;color:#3a2010;margin-bottom
