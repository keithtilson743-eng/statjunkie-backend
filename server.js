const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ODDS_API_KEY = process.env.ODDS_API_KEY; // optional; if missing we fall back to AI-only mode
const PORT = process.env.PORT || 3000;

// Map our league tabs to The Odds API sport keys
const SPORT_KEYS = {
  WNBA: "basketball_wnba",
  NBA: "basketball_nba",
  MLB: "baseball_mlb",
  NHL: "icehockey_nhl",
  NFL: "americanfootball_nfl",
};

// Player-prop markets to request per sport (Odds API naming)
const PROP_MARKETS = {
  WNBA: ["player_points", "player_rebounds", "player_assists", "player_threes"],
  NBA: ["player_points", "player_rebounds", "player_assists", "player_threes"],
  MLB: ["batter_hits", "batter_home_runs", "batter_total_bases", "pitcher_strikeouts"],
  NHL: ["player_points", "player_shots_on_goal", "player_assists"],
  NFL: ["player_pass_yds", "player_rush_yds", "player_receptions", "player_reception_yds"],
};

// Stat label used in the UI
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

// American odds -> implied probability
function impliedProb(american) {
  if (american == null) return null;
  return american >= 0 ? 100 / (american + 100) : -american / (-american + 100);
}

// Devig two-sided market: returns fair prob for each side
function devig(overOdds, underOdds) {
  const po = impliedProb(overOdds);
  const pu = impliedProb(underOdds);
  if (po == null || pu == null) return null;
  const sum = po + pu;
  return { over: po / sum, under: pu / sum, vig: sum - 1 };
}

// PrizePicks pays roughly 3x on a 2-pick power, 5x on 3-pick, etc.
// A pick is +EV vs PrizePicks (flat-line, no juice) if fair probability > 50%.
// edge = fair prob - 0.5, scaled.
function edgeScore(fairProb) {
  // 0.50 -> 0, 0.65 -> ~8.5, 0.75 -> 10
  const e = (fairProb - 0.5) * 40;
  return Math.max(0, Math.min(10, e));
}

// Pull events + player props from The Odds API
async function fetchRealProps(league) {
  const sportKey = SPORT_KEYS[league];
  if (!sportKey || !ODDS_API_KEY) return null;

  // 1) Get events happening today
  const evRes = await fetch(
    `https://api.the-odds-api.com/v4/sports/${sportKey}/events?apiKey=${ODDS_API_KEY}`
  );
  if (!evRes.ok) throw new Error(`Odds API events failed: ${evRes.status}`);
  const events = await evRes.json();
  if (!events.length) return [];

  // Filter to next 36 hours so we don't pull next week's NFL
  const now = Date.now();
  const cutoff = now + 36 * 3600 * 1000;
  const todays = events.filter((e) => {
    const t = new Date(e.commence_time).getTime();
    return t >= now - 3 * 3600 * 1000 && t <= cutoff;
  });
  if (!todays.length) return [];

  const markets = PROP_MARKETS[league].join(",");
  const props = [];

  // 2) For each event pull props (limit to 6 events to stay under quota)
  for (const ev of todays.slice(0, 6)) {
    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/events/${ev.id}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=${markets}&oddsFormat=american`;
    const r = await fetch(url);
    if (!r.ok) continue;
    const data = await r.json();
    const bookmakers = data.bookmakers || [];
    if (!bookmakers.length) continue;

    // Build a map: player|market -> array of {book, line, overOdds, underOdds}
    const lineMap = new Map();
    for (const bk of bookmakers) {
      for (const mk of bk.markets || []) {
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

    // Average across books and devig
    for (const [key, val] of lineMap.entries()) {
      const [player, market, point] = key.split("|");
      if (!val.over || !val.under) continue;
      const overAvg = val.over / (val.books / 2);
      const underAvg = val.under / (val.books / 2);
      const fair = devig(overAvg, underAvg);
      if (!fair) continue;

      const pick = fair.over > fair.under ? "OVER" : "UNDER";
      const fairProb = Math.max(fair.over, fair.under);
      props.push({
        player,
        team: abbr(ev.home_team),
        opponent: abbr(ev.away_team),
        home_team: ev.home_team,
        away_team: ev.away_team,
        stat: STAT_LABEL[market] || market,
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
      });
    }
  }

  // Sort by edge and keep top 8
  props.sort((a, b) => b.edge_score - a.edge_score);
  return props.slice(0, 8);
}

// 3-letter team abbreviation
function abbr(name) {
  if (!name) return "";
  const parts = name.split(" ");
  const last = parts[parts.length - 1];
  return last.slice(0, 3).toUpperCase();
}

// Ask Claude to write reasoning for the real props (optional enrichment)
async function enrichWithAI(league, realProps) {
  if (!ANTHROPIC_KEY || !realProps.length) return null;
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const list = realProps.slice(0, 5).map((p, i) =>
    `${i + 1}. ${p.player} ${p.pick} ${p.line} ${p.stat} (${p.away_team} @ ${p.home_team}, ${p.game_time}) — market-implied fair prob ${(p.fair_prob * 100).toFixed(1)}%`
  ).join("\n");

  const prompt = `Today is ${date}. League: ${league}. Below are 5 player props that are +EV vs PrizePicks based on devigged sportsbook consensus. For EACH prop, write 2-3 sharp sentences of reasoning covering: recent form vs the line, matchup angle, blowout/rotation risk. Be specific. Also write one "today's edge" summary sentence and pick the best 2-3 for a lineup.

Props:
${list}

Return ONLY raw JSON, no markdown:
{"summary":"one sharp sentence","best_lineup":["Player UNDER 16.5 Points","Player OVER 1.5 Hits"],"reasoning":[{"player":"name","text":"2-3 sentences","blowout_risk":"LOW|MEDIUM|HIGH","risk_factors":[{"factor":"Blowout Risk","level":"LOW","detail":"..."},{"factor":"Recent Form","level":"LOW","detail":"..."},{"factor":"Minutes Risk","level":"LOW","detail":"..."}]}]}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const d = await r.json();
    if (d.error) return null;
    const raw = (d.content || []).map((b) => b.text || "").join("").trim();
    const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
    if (s === -1) return null;
    return JSON.parse(raw.slice(s, e + 1));
  } catch {
    return null;
  }
}

// Fallback: pure AI mode (when no Odds API key) — same as original behavior
async function aiOnlyProps(league) {
  if (!ANTHROPIC_KEY) throw new Error("No ANTHROPIC_API_KEY configured on server");
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const prompt = `Today is ${date}. League: ${league}.
You are a sharp sports betting analyst. Give 5 elite PrizePicks player props with 8.0+ confidence. Use realistic current-season players for ${league}.
Consider blowout risk, recent form vs line, minutes/rotation, defensive matchup.
Return ONLY raw JSON, no markdown:
{"slate":"${league}","date":"${date}","summary":"one sharp sentence","best_lineup":["Player UNDER 16.5 Points"],"top_props":[{"player":"Full Name","team":"NYL","opponent":"PDX","stat":"Points","line":16.5,"pick":"UNDER","edge_score":8.5,"confidence":9.0,"combined_score":8.75,"reasoning":"3-4 sentences","blowout_risk":"HIGH","game_time":"7:00 PM ET","risk_factors":[{"factor":"Blowout Risk","level":"HIGH","detail":"..."},{"factor":"Minutes Risk","level":"HIGH","detail":"..."},{"factor":"Recent Form","level":"LOW","detail":"..."}]}]}`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  const raw = (d.content || []).map((b) => b.text || "").join("").trim();
  const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
  if (s === -1) throw new Error("AI returned no JSON");
  const parsed = JSON.parse(raw.slice(s, e + 1));
  if (!Array.isArray(parsed.top_props) || !parsed.top_props.length) {
    throw new Error("AI returned no props");
  }
  parsed.source = "ai_only";
  return parsed;
}

// Build final payload for the frontend
function buildPayload(league, realProps, ai) {
  const reasoningMap = new Map();
  (ai?.reasoning || []).forEach((r) => reasoningMap.set(r.player, r));

  const top_props = realProps.slice(0, 5).map((p) => {
    const r = reasoningMap.get(p.player) || {};
    const confidence = Math.min(10, p.fair_prob * 10 + 1.5);
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
      reasoning: r.text || `Market consensus across books implies a fair probability of ${(p.fair_prob * 100).toFixed(1)}% on the ${p.pick} ${p.line}. PrizePicks lists this at a flat ${p.line}, giving a ${(p.edge_score).toFixed(1)}/10 edge after devigging.`,
      blowout_risk: r.blowout_risk || "MEDIUM",
      game_time: p.game_time,
      risk_factors: r.risk_factors || [
        { factor: "Market Edge", level: "LOW", detail: `Fair prob ${(p.fair_prob * 100).toFixed(1)}% — strong consensus across books.` },
        { factor: "Recent Form", level: "MEDIUM", detail: "Verify last 5 game log before locking." },
        { factor: "Blowout Risk", level: "MEDIUM", detail: "Check game total and spread close to tip." },
      ],
    };
  });

  return {
    slate: league,
    date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    summary: ai?.summary || `${top_props.length} +EV ${league} props found vs PrizePicks consensus.`,
    best_lineup: ai?.best_lineup || top_props.slice(0, 3).map((p) => `${p.player} ${p.pick} ${p.line} ${p.stat}`),
    top_props,
    source: "real_odds",
  };
}

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (req, res) => {
  res.json({
    status: "StatJunkie backend running",
    version: "2.0.0",
    has_anthropic: !!ANTHROPIC_KEY,
    has_odds_api: !!ODDS_API_KEY,
    sports: Object.keys(SPORT_KEYS),
  });
});

app.post("/props", async (req, res) => {
  const { league } = req.body;
  if (!league) return res.status(400).json({ error: "league is required" });
  if (!SPORT_KEYS[league]) return res.status(400).json({ error: `Unsupported league: ${league}` });

  try {
    // Try real odds first
    if (ODDS_API_KEY) {
      const realProps = await fetchRealProps(league);
      if (realProps && realProps.length) {
        const ai = await enrichWithAI(league, realProps);
        return res.json(buildPayload(league, realProps, ai));
      }
      // No games today (e.g. NFL off-season) — fall through to AI mode
    }
    // Fallback: AI only
    const aiPayload = await aiOnlyProps(league);
    return res.json(aiPayload);
  } catch (err) {
    console.error("props error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

app.listen(PORT, () => console.log(`StatJunkie v2 on port ${PORT}`));
