const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => {
  res.json({ status: "running" });
});

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
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s===-1||e===-1) return res.status(500).json({ error:"No JSON" });
    const parsed = JSON.parse(raw.slice(s,e+1));
    res.json(parsed);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log("StatJunkie running on port " + PORT));
