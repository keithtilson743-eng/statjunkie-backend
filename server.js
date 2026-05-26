const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const GROQ_KEY = process.env.GROQ_API_KEY;
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const PORT = process.env.PORT || 3000;

const SPORT_KEYS = {
  WNBA: "basketball_wnba",
  NBA: "basketball_nba",
  MLB: "baseball_mlb",
  NHL: "icehockey_nhl",
  NFL: "americanfootball_nfl",
};

const PROP_MARKETS = {
  WNBA: ["player_points", "player_rebounds", "player_assists", "player_threes"],
  NBA: ["player_points", "player_rebounds", "player_assists", "player_threes"],
  MLB: ["batter_hits", "batter_home_runs", "batter_total_bases", "pitcher_strikeouts"],
  NHL: ["player_points", "player_shots_on_goal", "player_assists"],
  NFL: ["player_pass_yds", "player_rush_yds", "player_receptions", "player_reception_yds"],
};

const STAT_LABEL = {
  player_points: "Points",
  player_rebounds: "Rebounds",
  player_assists: "Assists",
  player_threes: "3-Pointers Made",
  player_shots_on_goal: "Shots on Goal",
  batter_hits: "Hits",
  batter_home_runs: "Home Runs",
  batter_total_bases: "Total Bases",
  pitcher_strikeouts: "Strikeouts",
  player_pass_yds: "Passing Yards",
  player_rush_yds: "Rushing Yards",
  player_receptions: "Receptions",
  player_reception_yds: "Receiving Yards",
};

const BLOWOUT_HURTS = ["Points", "Rebounds", "Assists", "Shots on Goal", "Receptions", "Receiving Yards", "Rushing Yards", "Passing Yards"];

const BLOWOUT_THRESHOLD = {
  WNBA: 10,
  NBA: 10,
  MLB: 2.5,
  NHL: 2.5,
  NFL: 10,
};

// Categorize each pick based on its profile
function categorizePick(p) {
  const edge = p.edge_score;
  const blowout = p.blowout_risk;

  // LOCK: high edge + low blowout risk = safest play
  if (edge >= 7.5 && blowout === "LOW") {
    return { tag: "🔒 LOCK", style: "lock", description: "Highest confidence play on the board" };
  }
  // ELITE: very high edge regardless of risk
  if (edge >= 8.5) {
    return { tag: "💎 ELITE", style: "elite", description: "Top-tier edge play" };
  }
  // SHARP: medium-high edge, where smart money goes
  if (edge >= 6 && edge < 7.5) {
    return { tag: "🎯 SHARP", style: "sharp", description: "Sharp money play" };
  }
  // VALUE: decent edge but not premium
  if (edge >= 4 && edge < 6) {
    return { tag: "💰 VALUE", style: "value", description: "Solid value play" };
  }
  // RISKY: high blowout risk
  if (blowout === "HIGH") {
    return { tag: "⚠️ RISKY", style: "risky", description: "High variance — blowout risk in play" };
  }
  // Default: standard pick
  return { tag: "📊 STANDARD", style: "standard", description: "Standard market play" };
}

// Generate hype-style flavor text based on pick profile
function hypeFlavor(p, cat) {
  const stat = p.stat;
  const pick = p.pick;
  const line = p.line;
  const player = p.player.split(" ").pop(); // last name
  const fairPct = (p.fair_prob * 100).toFixed(0);

  if (cat.style === "lock") {
    const lines = [
      `🔒 This is the safest play on the board. Hammer the ${pick}.`,
      `🔒 Lock it in. Devigged fair prob ${fairPct}% — books are practically giving this away.`,
      `🔒 The sharps are all over this. ${player} ${pick} ${line} is a smash.`,
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
  if (cat.style === "elite") {
    const lines = [
      `💎 ELITE edge spotted. ${fairPct}% fair prob on the ${pick} — books haven't caught up yet.`,
      `💎 This is the kind of edge that prints money. Don't sleep on ${player}.`,
      `💎 Books are mispricing this. Take the ${pick} before the line moves.`,
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
  if (cat.style === "sharp") {
    const lines = [
      `🎯 Sharp money is on the ${pick} here. ${fairPct}% fair prob across the consensus.`,
      `🎯 Quiet edge play. Not flashy but the math is there.`,
      `🎯 Where the wise guys are. ${player} ${pick} ${line} has real value.`,
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
  if (cat.style === "value") {
    const lines = [
      `💰 Modest edge but priced right. ${fairPct}% fair prob.`,
      `💰 Solid value here. Good lineup filler if you need to round out a slip.`,
      `💰 Small edge, low risk. ${player} ${pick} is reasonable.`,
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
  if (cat.style === "risky") {
    const lines = [
      `⚠️ HIGH variance. Blowout risk means starters get pulled — proceed with caution.`,
      `⚠️ Could hit big or bust hard. This game is begging for garbage time.`,
      `⚠️ Risky play. The spread says blowout — only touch this if you love the matchup.`,
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
  return `📊 Standard market play. Fair prob ${fairPct}%.`;
}

// Generate punchy daily slate summary
function dailySummary(props, league) {
  if (!props.length) return `No ${league} edges found today.`;
  const locks = props.filter(p => p.edge_score >= 7.5 && p.blowout_risk === "LOW").length;
  const elites = props.filter(p => p.edge_score >= 8.5).length;
  const blowouts = props.filter(p => p.blowout_risk === "HIGH").length;
  const unders = props.filter(p => p.pick === "UNDER").length;
  const overs = props.filter(p => p.pick === "OVER").length;

  const parts = [];
  if (elites > 0) parts.push(`💎 ${elites} ELITE play${elites > 1 ? "s" : ""}`);
  if (locks > 0) parts.push(`🔒 ${locks} LOCK${locks > 1 ? "s" : ""}`);
  if (blowouts > 3) parts.push(`⚠️ ${blowouts} blowout-risk games — fade counting stats`);
  if (unders > overs * 1.5) parts.push(`📉 UNDER-heavy slate`);
  else if (overs > unders * 1.5) parts.push(`📈 OVER-heavy slate`);

  if (!parts.length) return `${props.length} +EV ${league} plays found across today's slate.`;
  return `🎯 Today's ${league} slate: ${parts.join(" · ")}.`;
}

function impliedProb(american) {
  if (american == null) return null;
  return american >= 0 ? 100 / (american + 100) : -american / (-american + 100);
}

function devig(overOdds, underOdds) {
  const po = impliedProb(overOdds);
  const pu = impliedProb(underOdds);
  if (po == null || pu == null) return null;
  const sum = po + pu;
  return { over: po / sum, under: pu / sum, vig: sum - 1 };
}

function edgeScore(fairProb) {
  const e = (fairProb - 0.5) * 40;
  return Math.max(0, Math.min(10, e));
}

function abbr(name) {
  if (!name) return "";
  const parts = name.split(" ");
  const last = parts[parts.length - 1];
  return last.slice(0, 3).toUpperCase();
}

function extractGameContext(data, league) {
  const bookmakers = data.bookmakers || [];
  let spreads = [];
  let totals = [];
  for (const bk of bookmakers) {
    for (const mk of bk.markets || []) {
      if (mk.key === "spreads") {
        for (const o of mk.outcomes || []) {
          if (o.point != null) spreads.push(Math.abs(o.point));
        }
      }
      if (mk.key === "totals") {
        for (const o of mk.outcomes || []) {
          if (o.point != null) totals.push(o.point);
        }
      }
    }
  }
  const avgSpread = spreads.length ? spreads.reduce((a, b) => a + b, 0) / spreads.length : null;
  const avgTotal = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
  const threshold = BLOWOUT_THRESHOLD[league] || 10;
  let blowout_level = "LOW";
  if (avgSpread != null) {
    if (avgSpread >= threshold + 4) blowout_level = "HIGH";
    else if (avgSpread >= threshold) blowout_level = "MEDIUM";
  }
  return { spread: avgSpread, total: avgTotal, blowout_level };
}

async function fetchRealProps(league) {
  const sportKey = SPORT_KEYS[league];
  if (!sportKey || !ODDS_API_KEY) return null;

  const evRes = await fetch(
    `https://api.the-odds-api.com/v4/sports/${sportKey}/events?apiKey=${ODDS_API_KEY}`
  );
  if (!evRes.ok) throw new Error(`Odds API events failed: ${evRes.status}`);
  const events = await evRes.json();
  if (!events.length) return [];

  const now = Date.now();
  const cutoff = now + 36 * 3600 * 1000;
  const todays = events.filter((e) => {
    const t = new Date(e.commence_time).getTime();
    return t >= now - 3 * 3600 * 1000 && t <= cutoff;
  });
  if (!todays.length) return [];

  const markets = [...PROP_MARKETS[league], "spreads", "totals"].join(",");
  const props = [];

  for (const ev of todays.slice(0, 6)) {
    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/events/${ev.id}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=${markets}&oddsFormat=american`;
    const r = await fetch(url);
    if (!r.ok) continue;
    const data = await r.json();
    const bookmakers = data.bookmakers || [];
    if (!bookmakers.length) continue;

    const gameContext = extractGameContext(data, league);

    const lineMap = new Map();
    for (const bk of bookmakers) {
      for (const mk of bk.markets || []) {
        if (mk.key === "spreads" || mk.key === "totals" || mk.key === "h2h") continue;
        for (const o of mk.outcomes || []) {
          const key = `${o.description}|${mk.key}|${o.point}`;
          if (!lineMap.has(key)) lineMap.set(key, { over: null, under: null, books: 0 });
          const slot = lineMap.get(key);
          if (o.name === "Over") slot.over = (slot.over || 0) + o.price;
          if (o.name === "Under") slot.under = (slot.under || 0) + o.price;
          slot.books++;
        }
      }
    }

    for (const [key, val] of lineMap.entries()) {
      const [player, market, point] = key.split("|");
      if (!val.over || !val.under) continue;
      const overAvg = val.over / (val.books / 2);
      const underAvg = val.under / (val.books / 2);
      const fair = devig(overAvg, underAvg);
      if (!fair) continue;

      let pick = fair.over > fair.under ? "OVER" : "UNDER";
      let fairProb = Math.max(fair.over, fair.under);
      const stat = STAT_LABEL[market] || market;

      let blowoutNote = null;
      if (gameContext.blowout_level === "HIGH" && BLOWOUT_HURTS.includes(stat)) {
        const adjustedUnder = Math.min(0.95, fair.under + 0.05);
        const adjustedOver = 1 - adjustedUnder;
        if (adjustedUnder > adjustedOver) {
          pick = "UNDER";
          fairProb = adjustedUnder;
          blowoutNote = `Spread of ${gameContext.spread.toFixed(1)} → starters likely pulled in 4th, leaning UNDER on counting stats.`;
        }
      } else if (gameContext.blowout_level === "MEDIUM" && BLOWOUT_HURTS.includes(stat)) {
        const adjustedUnder = Math.min(0.95, fair.under + 0.025);
        const adjustedOver = 1 - adjustedUnder;
        if (adjustedUnder > adjustedOver) {
          pick = "UNDER";
          fairProb = adjustedUnder;
          blowoutNote = `Spread of ${gameContext.spread.toFixed(1)} → moderate blowout risk, slight UNDER lean.`;
        }
      }

      props.push({
        player,
        team: abbr(ev.home_team),
        opponent: abbr(ev.away_team),
        home_team: ev.home_team,
        away_team: ev.away_team,
        stat,
        market,
        line: parseFloat(point),
        pick,
        fair_prob: fairProb,
        edge_score: edgeScore(fairProb),
        game_time: new Date(ev.commence_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        }),
        spread: gameContext.spread,
        total: gameContext.total,
        blowout_risk: gameContext.blowout_level,
        blowout_note: blowoutNote,
      });
    }
  }

  props.sort((a, b) => b.edge_score - a.edge_score);
  return props.slice(0, 80);
}

async function enrichWithAI(league, realProps) {
  if (!GROQ_KEY || !realProps.length) return null;
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const list = realProps.slice(0, 8).map((p, i) =>
    `${i + 1}. ${p.player} ${p.pick} ${p.line} ${p.stat} (spread ${p.spread?.toFixed(1) || "?"}, blowout ${p.blowout_risk}) — fair prob ${(p.fair_prob * 100).toFixed(1)}%`
  ).join("\n");

  const prompt = `Today is ${date}. League: ${league}. Below are top +EV player props. Write each reasoning with PERSONALITY — like a confident sharp bettor texting their friend. Use phrases like "smash this", "books are sleeping", "this is a lock", "fade this", "sharps love it". Keep it 2-3 sentences max per pick. Be punchy, not dry.

Props:
${list}

Return ONLY raw JSON, no markdown:
{"summary":"one punchy sentence about today's slate","best_lineup":["Player UNDER 16.5 Points"],"reasoning":[{"player":"name","text":"2-3 punchy sentences"}]}`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + GROQ_KEY },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 2500,
        messages: [{ role: "user", content: prompt }]
      }),
    });
    const d = await r.json();
    if (d.error) return null;
    const raw = (d.choices || [])[0]?.message?.content || "";
    const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
    if (s === -1) return null;
    return JSON.parse(raw.slice(s, e + 1));
  } catch {
    return null;
  }
}

async function aiOnlyProps(league) {
  if (!GROQ_KEY) throw new Error("No GROQ_API_KEY configured on server");
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const prompt = `Today is ${date}. League: ${league}.
You are a sharp sports betting analyst with personality. Give 5 elite PrizePicks player props with 8.0+ confidence. Use realistic current-season players for ${league}. Write reasoning with PERSONALITY — "smash this", "books are sleeping", "lock it in", "fade this".
Return ONLY raw JSON, no markdown:
{"slate":"${league}","date":"${date}","summary":"one punchy sentence","best_lineup":["Player UNDER 16.5 Points"],"top_props":[{"player":"Full Name","team":"NYL","opponent":"PDX","stat":"Points","line":16.5,"pick":"UNDER","edge_score":8.5,"confidence":9.0,"combined_score":8.75,"reasoning":"2-3 punchy sentences","blowout_risk":"HIGH","game_time":"7:00 PM ET","risk_factors":[{"factor":"Blowout Risk","level":"HIGH","detail":"..."},{"factor":"Minutes Risk","level":"HIGH","detail":"..."},{"factor":"Recent Form","level":"LOW","detail":"..."}]}]}`;

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": "Bearer " + GROQ_KEY },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }]
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  const raw = (d.choices || [])[0]?.message?.content || "";
  const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
  if (s === -1) throw new Error("AI returned no JSON");
  const parsed = JSON.parse(raw.slice(s, e + 1));
  if (!Array.isArray(parsed.top_props) || !parsed.top_props.length) {
    throw new Error("AI returned no props");
  }
  parsed.source = "ai_only";
  return parsed;
}

function buildPayload(league, realProps, ai) {
  const reasoningMap = new Map();
  (ai?.reasoning || []).forEach((r) => reasoningMap.set(r.player, r));

  const top_props = realProps.slice(0, 80).map((p) => {
    const r = reasoningMap.get(p.player) || {};
    const confidence = Math.min(10, p.fair_prob * 10 + 1.5);
    const cat = categorizePick(p);
    const hype = hypeFlavor(p, cat);

    const riskFactors = [
      {
        factor: "Market Edge",
        level: p.edge_score >= 7 ? "LOW" : p.edge_score >= 4 ? "MEDIUM" : "HIGH",
        detail: `Fair prob ${(p.fair_prob * 100).toFixed(1)}% based on devigged sportsbook consensus.`
      },
      {
        factor: "Blowout Risk",
        level: p.blowout_risk || "LOW",
        detail: p.spread != null
          ? `Game spread: ${p.spread.toFixed(1)}${p.blowout_note ? " — " + p.blowout_note : ""}`
          : "Spread data unavailable."
      },
      {
        factor: "Game Total",
        level: "LOW",
        detail: p.total != null ? `Total points line: ${p.total}` : "Total unavailable."
      }
    ];

    // Build reasoning: hype line first, then Groq's reasoning (or fallback)
    let reasoning = `${cat.tag} — ${hype}`;
    if (r.text) {
      reasoning += ` ${r.text}`;
    } else if (p.blowout_note) {
      reasoning += ` ${p.blowout_note}`;
    }

    return {
      player: p.player,
      team: abbr(p.home_team),
      opponent: abbr(p.away_team),
      stat: p.stat,
      line: p.line,
      pick: p.pick,
      edge_score: +p.edge_score.toFixed(1),
      confidence: +confidence.toFixed(1),
      combined_score: +((p.edge_score + confidence) / 2).toFixed(2),
      reasoning,
      category: cat.tag,
      blowout_risk: p.blowout_risk || "LOW",
      game_time: p.game_time,
      risk_factors: riskFactors,
    };
  });

  return {
    slate: league,
    date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    summary: ai?.summary || dailySummary(realProps, league),
    best_lineup: ai?.best_lineup || top_props.slice(0, 3).map((p) => `${p.player} ${p.pick} ${p.line} ${p.stat}`),
    top_props,
    source: "real_odds",
  };
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (req, res) => {
  res.json({
    status: "StatJunkie backend running",
    version: "2.3.0",
    has_groq: !!GROQ_KEY,
    has_odds_api: !!ODDS_API_KEY,
    sports: Object.keys(SPORT_KEYS),
    features: ["real_odds", "blowout_detection", "groq_reasoning", "pick_categories", "hype_flavor"],
  });
});

app.post("/props", async (req, res) => {
  const { league } = req.body;
  if (!league) return res.status(400).json({ error: "league is required" });
  if (!SPORT_KEYS[league]) return res.status(400).json({ error: `Unsupported league: ${league}` });

  try {
    if (ODDS_API_KEY) {
      const realProps = await fetchRealProps(league);
      if (realProps && realProps.length) {
        const ai = await enrichWithAI(league, realProps);
        return res.json(buildPayload(league, realProps, ai));
      }
    }
    const aiPayload = await aiOnlyProps(league);
    return res.json(aiPayload);
  } catch (err) {
    console.error("props error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

app.listen(PORT, () => console.log(`StatJunkie v2.3 (Personality + Categories) on port ${PORT}`));
