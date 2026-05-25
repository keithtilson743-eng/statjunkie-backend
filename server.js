cat > /tmp/server-fixed.js << 'ENDOFFILE'
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT = process.env.PORT || 3000;

// Serve index.html at root
app.get("/", (req, res) => {
  const filePath = path.join(__dirname, "public", "index.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.send("StatJunkie - public/index.html not found. Path: " + filePath);
  }
});

// Health check
app.get("/health", (req, res) => {
  const filePath = path.join(__dirname, "public", "index.html");
  res.json({ 
    status: "StatJunkie backend running", 
    version: "1.0.0",
    dirname: __dirname,
    indexExists: fs.existsSync(filePath),
    indexPath: filePath
  });
});

// Generate props
app.post("/props", async (req, res) => {
  const { league } = req.body;
  if (!league) return res.status(400).json({ error: "league is required" });

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const prompt = `Today is ${date}. League: ${league}. You are a sharp sports betting analyst. Give me 5 elite PrizePicks player props with 8.0+ confidence out of 10. Return ONLY a raw JSON object. No markdown. No backticks. Start with { end with }. {"slate":"${league}","date":"${date}","summary":"One sharp sentence about today edge","best_lineup":["Player UNDER 16.5 Points","Player UNDER 13.5 Points"],"top_props":[{"player":"Full Name","team":"NYL","opponent":"PDX","stat":"Points","line":16.5,"pick":"UNDER","edge_score":8.5,"confidence":9.0,"combined_score":8.75,"reasoning":"3-4 sharp sentences why this hits","blowout_risk":"HIGH","game_time":"7:00 PM ET","risk_factors":[{"factor":"Blowout Risk","level":"HIGH","detail":"Team 88% favourite"},{"factor":"Minutes Risk","level":"HIGH","detail":"Gets pulled in Q4"},{"factor":"Recent Form","level":"LOW","detail":"11,11,14 last 3 games"}]}]}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = (data.content || []).map(b => b.text || "").join("").trim();
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s === -1 || e === -1) return res.status(500).json({ error: "No JSON in AI response" });

    const parsed = JSON.parse(cleaned.slice(s, e + 1));
    if (!Array.isArray(parsed.top_props) || !parsed.top_props.length) {
      return res.status(500).json({ error: "No props in AI response" });
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || "Server error" });
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => console.log(`StatJunkie on port ${PORT}`));
ENDOFFILE
cat /tmp/server-fixed.js
