#!/usr/bin/env node
// Keyword intake: read exports from Google Keyword Planner, Google Trends and Google Search Console,
// normalise them, score them, and propose topic clusters.
//
//   node scripts/keywords.mjs --in planner.csv trends-related.csv gsc-queries.csv
//        [--out strategy/keywords.json] [--min-volume 100] [--top 40] [--clusters 8]
//        [--focus "invoice,payables"] [--exclude "free,jobs,login"]
//
// Keyword Planner exports are often UTF-16 tab-separated files with two preface lines; Trends and
// Search Console exports are normal CSVs. The file type is detected from its content, not its name.

import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const listAfter = (name) => { const i = argv.indexOf(name); if (i < 0) return []; const out = []; for (let j = i + 1; j < argv.length && !argv[j].startsWith("--"); j++) out.push(argv[j]); return out; };
const files = listAfter("--in");
if (!files.length) {
  console.error("Usage: node scripts/keywords.mjs --in <export.csv> [more files] [--out strategy/keywords.json] [--min-volume N] [--top N] [--clusters N] [--focus a,b] [--exclude a,b]");
  process.exit(2);
}
const minVol = Number(flag("--min-volume") ?? 0);
const topN = Number(flag("--top") ?? 40);
const nClusters = Number(flag("--clusters") ?? 8);
const focus = (flag("--focus") ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
const exclude = (flag("--exclude") ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
const outFile = flag("--out");

// ---------------------------------------------------------------- reading
function readText(file) {
  const buf = fs.readFileSync(file);
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.slice(2).toString("utf16le");
  if (buf[0] === 0xfe && buf[1] === 0xff) { const b = Buffer.from(buf.slice(2)); b.swap16(); return b.toString("utf16le"); }
  let t = buf.toString("utf8");
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  return t;
}

function splitRow(line, d) {
  const out = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; continue; }
    if (c === '"') { q = true; continue; }
    if (c === d) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toRows(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const sample = lines.slice(0, 8).join("\n");
  const count = (ch) => (sample.match(new RegExp(ch === "\t" ? "\\t" : ch, "g")) || []).length;
  const d = count("\t") >= count(",") && count("\t") >= count(";") ? "\t" : count(";") > count(",") ? ";" : ",";
  return lines.map((l) => splitRow(l, d));
}

const parseNum = (s) => {
  if (s == null) return null;
  const m = String(s).trim().match(/^([\d.,]+)\s*([KkMm]?)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  return m[2] ? n * (m[2].toLowerCase() === "k" ? 1e3 : 1e6) : n;
};
const parseRangeMax = (s) => { const m = String(s ?? "").split(/[–—-]/); return m.length > 1 ? parseNum(m[m.length - 1]) : parseNum(s); };
const pct = (s) => { const m = String(s ?? "").match(/-?[\d.]+/); return m ? parseFloat(m[0]) : null; };
const colIdx = (header, re) => header.findIndex((h) => re.test(h));

// ---------------------------------------------------------------- detectors
function parsePlanner(rows) {
  const hi = rows.findIndex((r) => r.some((c) => /^keyword$/i.test(c)));
  if (hi < 0) return null;
  const h = rows[hi].map((c) => c.toLowerCase());
  const k = colIdx(h, /^keyword$/), v = colIdx(h, /avg\.?\s*monthly\s*searches/), comp = colIdx(h, /^competition$/);
  const lo = colIdx(h, /top of page bid.*low/), hiB = colIdx(h, /top of page bid.*high/), c3 = colIdx(h, /three month change|3.?month/), yoy = colIdx(h, /yoy/);
  if (k < 0 || v < 0) return null;
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    const kw = (r[k] ?? "").trim(); if (!kw) continue;
    out.push({
      keyword: kw.toLowerCase(), source: "planner",
      volume: parseNum(r[v]) ?? 0, volumeMax: parseRangeMax(r[v]) ?? 0, volumeIsRange: /[–—-]/.test(r[v] ?? ""),
      competition: comp >= 0 ? r[comp] : null, bidLow: lo >= 0 ? parseNum(r[lo]) : null, bidHigh: hiB >= 0 ? parseNum(r[hiB]) : null,
      change3m: c3 >= 0 ? pct(r[c3]) : null, yoy: yoy >= 0 ? pct(r[yoy]) : null,
    });
  }
  return out;
}

function parseGsc(rows) {
  const hi = rows.findIndex((r) => r.some((c) => /^(top )?quer(y|ies)$/i.test(c)) && r.some((c) => /impressions/i.test(c)));
  if (hi < 0) return null;
  const h = rows[hi].map((c) => c.toLowerCase());
  const k = colIdx(h, /quer/), cl = colIdx(h, /clicks/), im = colIdx(h, /impressions/), ps = colIdx(h, /position/);
  return rows.slice(hi + 1).filter((r) => r[k]).map((r) => ({
    keyword: r[k].toLowerCase(), source: "gsc", clicks: parseNum(r[cl]) ?? 0, impressions: parseNum(r[im]) ?? 0, position: ps >= 0 ? parseFloat(r[ps]) : null,
  }));
}

function parseTrendsRelated(rows) {
  const idx = rows.map((r, i) => (/^(top|rising)$/i.test(r[0] ?? "") && (r.length === 1 || r.slice(1).every((c) => c === "")) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return null;
  const out = [];
  idx.forEach((start, n) => {
    const kind = rows[start][0].toLowerCase();
    const end = idx[n + 1] ?? rows.length;
    for (const r of rows.slice(start + 1, end)) {
      if (!r[0] || /^(query|topic)$/i.test(r[0]) || /^related/i.test(r[0])) continue;
      const raw = r[1] ?? "";
      out.push({ keyword: r[0].toLowerCase(), source: `trends-${kind}`, trendValue: /breakout/i.test(raw) ? "Breakout" : pct(raw), breakout: /breakout/i.test(raw) });
    }
  });
  return out;
}

function parseTrendsInterest(rows) {
  const hi = rows.findIndex((r) => /^(week|day|month|time|date)$/i.test(r[0] ?? "") && r.length >= 2);
  if (hi < 0) return null;
  const header = rows[hi]; const data = rows.slice(hi + 1).filter((r) => r.length === header.length);
  if (data.length < 4) return null;
  const out = [];
  for (let c = 1; c < header.length; c++) {
    const vals = data.map((r) => parseFloat(String(r[c]).replace("<1", "0.5"))).filter((x) => !Number.isNaN(x));
    if (!vals.length) continue;
    const q = Math.max(1, Math.floor(vals.length / 4));
    const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
    const first = avg(vals.slice(0, q)), last = avg(vals.slice(-q));
    out.push({ keyword: header[c].replace(/:\s*\(.*\)\s*$/, "").toLowerCase(), source: "trends-interest", interestAvg: Math.round(avg(vals)), interestTrend: first ? Math.round(((last - first) / first) * 100) : null });
  }
  return out;
}

// ---------------------------------------------------------------- merge + score
const merged = new Map();
const summary = [];
for (const f of files) {
  if (!fs.existsSync(f)) { console.error(`File not found: ${f}`); process.exit(2); }
  const rows = toRows(readText(f));
  const kind = parsePlanner(rows) ? "planner" : parseGsc(rows) ? "gsc" : parseTrendsRelated(rows) ? "trends-related" : parseTrendsInterest(rows) ? "trends-interest" : null;
  const parsed = kind === "planner" ? parsePlanner(rows) : kind === "gsc" ? parseGsc(rows) : kind === "trends-related" ? parseTrendsRelated(rows) : kind === "trends-interest" ? parseTrendsInterest(rows) : null;
  if (!parsed) { console.error(`! Could not recognise ${path.basename(f)} (expected a Keyword Planner, Trends or Search Console export). Skipped.`); continue; }
  summary.push(`${path.basename(f)}: ${kind}, ${parsed.length} rows`);
  for (const r of parsed) {
    const cur = merged.get(r.keyword) ?? { keyword: r.keyword, sources: [] };
    cur.sources = [...new Set([...cur.sources, r.source])];
    for (const [k, v] of Object.entries(r)) if (k !== "keyword" && k !== "source" && v !== null && v !== undefined) cur[k] = v;
    merged.set(r.keyword, cur);
  }
}

const COMMERCIAL = /\b(best|top|vs|versus|compare|comparison|alternative|alternatives|review|reviews|pricing|price|cost|software|tool|tools|platform|service|services|company|companies|buy|hire|quote|near me)\b/;
const INFO = /\b(how|what|why|when|guide|tutorial|examples?|template|templates|checklist|meaning|definition|learn|ideas)\b/;

let rows = [...merged.values()].map((r) => {
  const bid = r.bidHigh ?? r.bidLow ?? null;
  const vol = r.volume ?? 0;
  return {
    ...r,
    stage: COMMERCIAL.test(r.keyword) ? "buyer" : INFO.test(r.keyword) ? "learn" : "solution",
    value: Math.round(vol * (bid ?? 1)),
    strikingDistance: r.position != null && r.position >= 8 && r.position <= 30 && (r.impressions ?? 0) >= 20,
  };
});
rows = rows.filter((r) => (r.volume ?? 0) >= minVol || r.sources.some((s) => s.startsWith("trends") || s === "gsc"));
if (focus.length) rows = rows.filter((r) => focus.some((f) => r.keyword.includes(f)));
if (exclude.length) rows = rows.filter((r) => !exclude.some((f) => r.keyword.includes(f)));
rows.sort((a, b) => (b.value - a.value) || ((b.volume ?? 0) - (a.volume ?? 0)) || ((b.impressions ?? 0) - (a.impressions ?? 0)));

// ---- clusters: greedy by the heaviest shared term
const STOP = new Set("a an the to of for and or in on with how what why is are do does can your you vs versus best top near me my i it at by from as be".split(" "));
// crude stemming so "compost", "composting" and "composts" land in one cluster
const stem = (w) => (w.length > 5 ? w.replace(/(ing|ed|es|s)$/, "") : w.replace(/s$/, ""));
const toks = (s) => s.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)).map(stem);
const weight = new Map();
for (const r of rows) for (const t of new Set(toks(r.keyword))) weight.set(t, (weight.get(t) ?? 0) + Math.max(1, r.volume ?? r.impressions ?? 1));
const left = new Set(rows.map((r) => r.keyword));
const clusters = [];
for (let n = 0; n < nClusters; n++) {
  const head = [...weight.entries()].filter(([t]) => [...left].some((k) => toks(k).includes(t))).sort((a, b) => b[1] - a[1])[0];
  if (!head) break;
  const members = rows.filter((r) => left.has(r.keyword) && toks(r.keyword).includes(head[0]));
  members.forEach((m) => left.delete(m.keyword));
  const volume = members.reduce((s, m) => s + (m.volume ?? 0), 0);
  clusters.push({
    head: head[0], keywords: members.length, volume,
    buyerShare: Math.round((members.filter((m) => m.stage === "buyer").length / members.length) * 100),
    top: members.slice(0, 6).map((m) => m.keyword),
    subthemes: (() => {
      const c = new Map();
      for (const m of members) for (const t of new Set(toks(m.keyword))) if (t !== head[0]) c.set(t, (c.get(t) ?? 0) + 1);
      return [...c.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, n]) => `${t} (${n})`);
    })(),
  });
  weight.delete(head[0]);
}
clusters.sort((a, b) => b.volume - a.volume);

// ---------------------------------------------------------------- output
console.log(summary.join("\n"));
console.log(`\n${rows.length} keywords after filters. Top ${Math.min(topN, rows.length)} by value (volume × top-of-page bid):\n`);
const fmt = (r) => `${r.keyword.padEnd(46).slice(0, 46)} ${String(r.volume ?? "").padStart(8)}  ${String(r.bidHigh ?? r.bidLow ?? "").padStart(6)}  ${(r.competition ?? "").toString().padEnd(7)} ${r.stage.padEnd(8)} ${r.sources.join("+")}${r.strikingDistance ? "  ★ striking distance" : ""}${r.breakout ? "  ★ breakout" : ""}`;
console.log("keyword".padEnd(46), "searches".padStart(8), "  bid".padStart(8), " comp".padEnd(8), "stage".padEnd(8), "sources");
for (const r of rows.slice(0, topN)) console.log(fmt(r));
if (clusters.length) {
  console.log("\nProposed clusters (pillar candidates):");
  for (const c of clusters) console.log(` • "${c.head}": ${c.keywords} keywords, ${c.volume}/mo total, ${c.buyerShare}% buyer-intent. e.g. ${c.top.slice(0, 4).join(" | ")}${c.subthemes.length ? `\n     sub-themes (candidate cluster posts): ${c.subthemes.join(", ")}` : ""}`);
}
const sd = rows.filter((r) => r.strikingDistance);
if (sd.length) console.log(`\nStriking-distance queries from Search Console (positions 8–30, quick wins to refresh): ${sd.slice(0, 10).map((r) => r.keyword).join(" | ")}`);

if (outFile) {
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), files: files.map((f) => path.basename(f)), rows, clusters }, null, 2));
  console.log(`\nSaved ${rows.length} rows and ${clusters.length} clusters to ${outFile}`);
}
