#!/usr/bin/env node
// Plan for one publishing run, so the run never has to read the whole backlog.
//
//   node scripts/plan.mjs                       use seo.config.json (program.postsPerDay / maxPerRun)
//   node scripts/plan.mjs --per-day 3 --max 4   override
//
// Prints: how many posts are due (catch-up rule), a ready BATCH PLAN (one topic per pillar, distinct
// numbered headline shapes), the quality bar to match or beat, the latest lessons, and the next
// planned topics per pillar. Counting is by each post's publishedAt date (UTC).

import fs from "node:fs";
import path from "node:path";
import { BAR_KEYS, BAR_LABEL, daysAgo, loadConfig, readPosts, recentBar, today } from "./lib.mjs";

const cfg = loadConfig();
const arg = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? Number(process.argv[i + 1]) : NaN; };
const perDay = arg("--per-day") || cfg.program.postsPerDay;
const max = arg("--max") || cfg.program.maxPerRun || perDay;

const posts = readPosts(cfg).filter((p) => p.fm && p.fm.draft !== true);
const day = (p) => String(p.fm.publishedAt ?? "").slice(0, 10);
const count = (d) => posts.filter((p) => day(p) === d).length;
const t0 = today(), y0 = daysAgo(1);

// Days before program.startDate have no target, so a new site does not "owe" a backlog of posts.
const start = cfg.program.startDate ?? "0000-00-00";
const yTarget = y0 >= start ? perDay : 0;
const tTarget = t0 >= start ? perDay : 0;
const expected = yTarget + tTarget;
const published = count(y0) + count(t0);
const due = Math.max(0, Math.min(max, expected - published));

console.log(`Today ${t0} (${count(t0)} published) · yesterday ${y0} (${count(y0)} published) · target ${perDay}/day`);
console.log(`Catch-up rule: expected ${expected}, published ${published} -> publish ${due} post(s) now (max ${max} per run).`);
if (!due) console.log("Nothing to publish this run.");

// ---- backlog
const sdir = path.resolve(cfg.root, cfg.paths.strategy);
const bf = path.join(sdir, "backlog.json");
const topics = fs.existsSync(bf) ? (JSON.parse(fs.readFileSync(bf, "utf8")).topics ?? []) : [];
const planned = topics.filter((t) => t.status === "planned");
const active = cfg.pillars.filter((p) => p.status !== "retired");
const todaysPillars = posts.filter((p) => day(p) === t0).map((p) => p.fm.pillar);

// ---- headline shapes (year-edition aware): the numbered format used least in the last 10 posts, rotated daily
const Y = cfg.yearEdition.enabled ? ` ${cfg.yearEdition.year}` : "";
const FORMATS = [
  { id: "Top N", re: /\btop \d+|\bbest \d+|\b\d+ best\b/i, ex: `Top 5 [Tools/Options] for [Audience] in${Y || " 20XX"}`.replace("in 20XX", "") },
  { id: "N Ways", re: /\b\d+ ways\b/i, ex: `7 Ways to [Get Result]${Y ? " in" + Y : ""}` },
  { id: "N Mistakes", re: /\b\d+ (mistakes|pitfalls|myths)\b/i, ex: `5 Mistakes to Avoid When [Doing Thing]${Y ? " in" + Y : ""}` },
  { id: "N-Step Plan", re: /\b\d+[- ](steps?|stages?|phases?)\b/i, ex: `A 4-Step Plan to [Reach Goal]${Y ? " in" + Y : ""}` },
  { id: "N Signs/Questions", re: /\b\d+ (signs|questions|checks|metrics|features|reasons|things)\b/i, ex: `6 Signs You Need [Solution]${Y ? " in" + Y : ""}` },
  { id: "N Tools/Use cases", re: /\b\d+ (tools|use cases|examples|templates|alternatives|rules|tactics)\b/i, ex: `9 [Use Cases/Examples] Worth Trying${Y ? " in" + Y : ""}` },
];
const recent = [...posts].sort((a, b) => day(b).localeCompare(day(a))).slice(0, 10);
const dayNo = Math.floor(Date.now() / 864e5);
const shapes = FORMATS.map((f, i) => ({ f, n: recent.filter((p) => f.re.test(String(p.fm.h1 ?? ""))).length, r: (i + dayNo) % FORMATS.length }))
  .sort((a, b) => a.n - b.n || a.r - b.r).map((x) => x.f);

const isCost = (t) => /\b(cost|costs|pricing|price|prices|how much)\b/i.test(`${t.id} ${t.question}`);
const byCount = active.map((p) => ({ p, n: posts.filter((x) => x.fm.pillar === p.slug).length })).sort((a, b) => a.n - b.n);

if (due) {
  const batch = []; const covered = new Set(todaysPillars); const picked = new Set();
  // Round 1 prefers pillars not covered yet today; later rounds reuse pillars (small sites have few) with different topics.
  for (let round = 0; round < due && batch.length < due; round++) {
    let added = false;
    for (const { p } of byCount) {
      if (batch.length >= due) break;
      if (round === 0 && covered.has(p.slug)) continue;
      if (batch.some((b) => b.p.slug === p.slug) && round === 0) continue;
      const pool = planned.filter((x) => x.pillar === p.slug && !picked.has(x.id));
      // an unpublished pillar guide goes first, then the first topic that is not a cost/price topic
      const t = pool.find((x) => x.type === "pillar") ?? pool.find((x) => !isCost(x)) ?? pool[0];
      if (t) { batch.push({ p, t }); picked.add(t.id); covered.add(p.slug); added = true; }
    }
    if (!added && round > 0) break;
  }
  console.log(`\nBATCH PLAN (${due} post(s), different topics (one per pillar first), distinct headline shapes; cost/price topics are skipped when another topic exists because they need real figures):`);
  const used = new Set();
  batch.forEach(({ p, t }, i) => {
    const wantsTop = t.stage === "buyer" || /\b(best|vs|versus|compare|software|tools?|alternatives?)\b/i.test(t.question);
    const order = wantsTop ? [shapes.find((x) => x.id === "Top N"), ...shapes] : shapes;
    const sh = order.find((x) => x && !used.has(x.id)) ?? shapes[i % shapes.length];
    used.add(sh.id);
    console.log(` ${i + 1}. ${p.slug} · ${t.id}${isCost(t) ? "  [COST TOPIC: sourced figures only]" : ""}${t.type === "pillar" ? "  [PILLAR GUIDE]" : ""}\n    Q: ${t.question}\n    KW: ${t.primaryKeyword}${t.monthlySearches ? ` (${t.monthlySearches}/mo)` : ""} · shape: ${sh.id}, e.g. "${sh.ex}" (change it if another numbered shape fits better, but keep each post in the batch different)`);
  });
  if (!batch.length) console.log("  (no planned topics available: grow the backlog first, see references/02-keyword-strategy.md)");

  if (cfg.yearEdition.enabled) console.log(`\nYEAR EDITION (${cfg.yearEdition.year}, QA-enforced from ${cfg.yearEdition.from}): SEO title and H1 carry "${cfg.yearEdition.year}" plus a number that matches numbered "## 1. Name" H2s; the year is also in the description, first paragraph and one H2.`);
  if (cfg.conversion.enabled) console.log("CONVERSION (QA-enforced): a next-step H2, an in-body link to a conversion page, and a closing line that recommends a concrete next step. No fake urgency.");

  const bar = recentBar(posts, t0, "", cfg.ratchet.window);
  if (bar.n) console.log(`\nQUALITY BAR (median of the last ${bar.n} posts; match or beat every item and add one improvement from strategy/LEARNINGS.md):\n  ` + BAR_KEYS.map((k) => `${BAR_LABEL[k]} ${bar.median[k]}`).join(" · ") + ` · words ${bar.median.words}`);

  const lf = path.join(sdir, "LEARNINGS.md");
  if (fs.existsSync(lf)) {
    const lines = fs.readFileSync(lf, "utf8").split("\n");
    const i = lines.findIndex((l) => /^## Lessons log/.test(l));
    const log = i >= 0 ? lines.slice(i + 1).filter((l) => l.startsWith("- ")).slice(-6) : [];
    console.log(`\nRECENT LESSONS (last ${log.length}):\n${log.join("\n") || "  (none yet)"}`);
  }
}

console.log(`\nToday's pillars so far: ${todaysPillars.join(", ") || "none"} (pick different ones).`);
const guides = active.filter((p) => !topics.some((t) => t.pillar === p.slug && t.type === "pillar" && t.status === "published"));
if (guides.length) console.log(`Pillar guides not yet published (these go first): ${guides.map((g) => g.slug).join(", ")}`);
const runway = perDay * 14;
if (planned.length < runway) console.log(`Only ${planned.length} planned topics left (${runway} = two weeks): grow the backlog first.`);

console.log("\nActive pillars, least covered first, with the next planned topics:");
for (const { p, n } of byCount) {
  const next = planned.filter((t) => t.pillar === p.slug).slice(0, 3);
  console.log(`\n- ${p.slug} (${n} published)${todaysPillars.includes(p.slug) ? " · already covered today" : ""}`);
  for (const t of next) console.log(`    [${t.stage ?? "-"}] ${t.id}\n      Q: ${t.question}\n      KW: ${t.primaryKeyword} · angle: ${t.angle ?? "-"}`);
  if (!next.length) console.log("    (no planned topics)");
}
