#!/usr/bin/env node
// Quality gate for posts. Blocking problems are ERRORS (exit code 1), softer ones are WARNINGS.
//
//   node scripts/qa.mjs                  check every post
//   node scripts/qa.mjs <slug|file> ...  check specific posts
//   node scripts/qa.mjs --json           machine-readable report
//   node scripts/qa.mjs --config path/to/seo.config.json
//
// Every threshold lives in seo.config.json ("rules", "yearEdition", "conversion", "ratchet").
// What it enforces: one search intent per post, answer-first structure, sourced facts, real links,
// human-sounding prose, an optional "future-year edition" and conversion structure, and a quality
// bar that each new post must match or beat (the ratchet).

import {
  BAR_KEYS, BAR_LABEL, dateStr, loadConfig, metricsOf, norm, proseOf, readPosts, recentBar,
} from "./lib.mjs";

const cfg = loadConfig();
const R = cfg.rules;

// Phrases that make text read as machine-written. Each hit is an error: rewrite the sentence.
const BANNED = [
  "delve", "delving", "in today's fast-paced", "in today’s fast-paced", "ever-evolving", "ever-changing landscape",
  "it's important to note", "it is important to note", "it’s important to note", "it's worth noting", "it’s worth noting",
  "in conclusion", "in summary,", "unlock the power", "unlock the full potential", "game-changer", "game changer",
  "tapestry", "a testament to", "navigate the complexities", "navigating the complexities", "in the realm of",
  "embark on", "harness the power", "revolutionize", "revolutionise", "cutting-edge", "state-of-the-art",
  "seamlessly", "seamless integration", "paradigm shift", "synergy", "elevate your", "supercharge",
  "look no further", "whether you're a", "whether you’re a", "let's dive", "let’s dive", "dive into", "deep dive into",
  "picture this", "imagine a world", "at the end of the day", "the world of", "plays a crucial role",
  "plays a pivotal role", "pivotal", "robust and scalable", "empower", "empowering", "transformative",
  "as an ai language model", "as an ai model", "as an ai assistant", "i hope this helps", "great question", "certainly!",
];
const WARN_WORDS = ["leverage", "utilize", "utilise", "furthermore", "moreover", "additionally", "crucial", "vital", "comprehensive", "landscape", "foster", "streamline", "robust"];
const PLACEHOLDERS = [/\bTODO\b/, /lorem ipsum/i, /\[insert/i, /\bXX%/, /\bTBD\b/, /\[citation needed\]/i, /\{\{.*\}\}/];
const URGENCY = /\b(limited (spots|slots|availability)|act now|only \d+ (spots|slots|seats) (left|remaining)|don't miss out|don’t miss out|hurry|last chance|selling fast)\b/i;

const STOP = new Set("a an the to of for and or in on with how what why is are do does can your you vs versus best guide top ways steps mistakes".split(" "));
const tokens = (s) => new Set(norm(s).split(" ").filter((w) => w && !STOP.has(w) && !/^\d{1,4}$/.test(w)));
const jaccard = (a, b) => {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let i = 0;
  for (const t of A) if (B.has(t)) i++;
  return i / (A.size + B.size - i);
};

const pillarSlugs = cfg.pillars.map((p) => p.slug);
const authorSlugs = Object.keys(cfg.authors);
const num = (v, type, fallback) => (v && typeof v === "object" ? v[type] ?? fallback : v ?? fallback);

function checkPost(p, all) {
  const E = [], W = [];
  const err = (m) => E.push(m), warn = (m) => W.push(m);
  const fm = p.fm;
  if (p.error) { err(p.error); if (!fm || !Object.keys(fm).length) return { E, W }; }
  if (!fm) { err("Missing YAML frontmatter"); return { E, W }; }
  const type = fm.type === "pillar" ? "pillar" : "cluster";

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) err(`Slug "${p.slug}" must be lowercase-hyphenated`);
  if (p.slug.length > 70) warn(`Slug is long (${p.slug.length} chars)`);

  // ---- Metadata
  for (const k of ["title", "h1", "description", "pillar", "type", "primaryKeyword", "question", "publishedAt", "author", "originality"]) {
    if (!fm[k] || String(fm[k]).trim() === "") err(`Missing frontmatter field: ${k}`);
  }
  const title = String(fm.title ?? ""), desc = String(fm.description ?? ""), h1 = String(fm.h1 ?? "");
  if (title.length > R.titleMax) err(`SEO title is ${title.length} chars (max ${R.titleMax}); search engines truncate long titles`);
  else if (title.length > R.titleMax - 7) warn(`SEO title is ${title.length} chars; it may be truncated in results`);
  if (title && title.length < 20) warn("SEO title is very short");
  if (desc.length < R.descriptionMin || desc.length > R.descriptionMax) err(`Meta description is ${desc.length} chars (must be ${R.descriptionMin}–${R.descriptionMax})`);
  if (pillarSlugs.length) {
    const pl = cfg.pillars.find((x) => x.slug === fm.pillar);
    if (!pl) err(`Unknown pillar "${fm.pillar}" (allowed: ${pillarSlugs.join(", ")})`);
    else if (pl.status === "retired") err(`Pillar "${fm.pillar}" is retired; use an active pillar`);
  }
  if (!["pillar", "cluster"].includes(fm.type)) err('type must be "pillar" or "cluster"');
  const pub = dateStr(fm.publishedAt);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pub)) err(`publishedAt must be YYYY-MM-DD (got "${pub}")`);
  if (fm.updatedAt && dateStr(fm.updatedAt) < pub) err("updatedAt is before publishedAt");
  if (authorSlugs.length && !cfg.authors[fm.author]) err(`Unknown author "${fm.author}" (add real authors to seo.config.json)`);
  if (!fm.reviewer) { if (R.requireReviewer) err("No reviewer set"); else warn("No named reviewer (trust signal: add a real expert reviewer where readers expect one)"); }
  else if (authorSlugs.length && !cfg.authors[fm.reviewer]) err(`Unknown reviewer "${fm.reviewer}"`);
  if (String(fm.originality ?? "").length < 40) err("originality must explain (40+ chars) what this post adds that other pages don't: your data, a tested process, a diagram, a first-hand case");

  const kw = norm(fm.primaryKeyword);
  if (kw && !norm(`${title} ${h1}`).includes(kw.split(" ").slice(0, 3).join(" "))) warn(`Primary keyword "${fm.primaryKeyword}" not found in title/H1`);

  // ---- Answer-first structure
  const takeaways = Array.isArray(fm.takeaways) ? fm.takeaways : [];
  if (takeaways.length < R.minTakeaways || takeaways.length > R.maxTakeaways) err(`takeaways must have ${R.minTakeaways}–${R.maxTakeaways} items (has ${takeaways.length})`);
  const faqs = Array.isArray(fm.faqs) ? fm.faqs : [];
  const minFaq = num(R.minFaqs, type, 3);
  if (faqs.length < minFaq) err(`Needs at least ${minFaq} FAQs (has ${faqs.length})`);
  for (const f of faqs) {
    if (!f?.q || !f?.a) { err("FAQ item missing q or a"); continue; }
    const n = String(f.a).split(/\s+/).length;
    if (n < 25) warn(`FAQ answer too thin (${n} words): "${String(f.q).slice(0, 50)}"`);
    if (n > 120) warn(`FAQ answer long (${n} words); answer engines favour 40–90`);
  }

  // ---- Body
  const body = p.body;
  const prose = proseOf(body);
  const words = prose.split(/\s+/).filter(Boolean).length;
  const minWords = num(R.minWords, type, 1200);
  if (words < minWords) err(`Body has ${words} words (minimum ${minWords} for a ${type})`);
  const h2s = body.match(/^## .*$/gm) || [];
  if (h2s.length < num(R.minH2, type, 4)) err(`Only ${h2s.length} H2 sections (need ${num(R.minH2, type, 4)}+)`);
  if (/^# /m.test(body)) err("Body must not contain an H1 (#); the page renders the H1 from frontmatter");

  // Heading outline: duplicate headings and skipped levels (warnings)
  const headings = [...body.matchAll(/^(#{2,6}) +(.*)$/gm)].map((m) => ({ level: m[1].length, text: m[2].trim() }));
  if (R.duplicateHeadings !== false) {
    const seen = new Map();
    for (const h of headings) {
      const key = norm(h.text);
      if (!key) continue;
      if (seen.has(key)) warn(`Duplicate heading "${h.text}"`);
      else seen.set(key, true);
    }
  }
  if (R.skippedHeadingLevels !== false) {
    let prev = 1; // body starts at H1 level contextually
    for (const h of headings) {
      if (h.level > prev + 1) warn(`Skipped heading level: H${h.level} "${h.text}" follows H${prev}`);
      prev = h.level;
    }
  }

  const firstPara = prose.trim().split(/\n\s*\n/)[0] ?? "";
  const fpWords = firstPara.split(/\s+/).filter(Boolean).length;
  if (fpWords > 90) warn(`Opening paragraph is ${fpWords} words; lead with a direct 40–80 word answer`);
  if (kw && !norm(prose.split(/\s+/).slice(0, 150).join(" ")).includes(kw.split(" ").slice(0, 2).join(" "))) warn("Primary keyword topic not mentioned in the first 150 words");

  // ---- Visuals (tables, images, charts)
  const m = metricsOf(fm, body);
  if (R.requireVisual && m.visuals < 1) err("Needs at least one visual element (a comparison table, an image with alt text, or a chart block)");
  for (const blk of body.matchAll(/```infographic\s*\n([\s\S]*?)```/g)) {
    let spec;
    try { spec = JSON.parse(blk[1]); } catch (e) { err(`Infographic JSON invalid: ${e.message}`); continue; }
    if ((spec.type === "bar" || spec.type === "stats") && !spec.source) err(`Data chart "${spec.title ?? ""}" needs a source (or an own-data label)`);
  }
  for (const im of prose.matchAll(/!\[([^\]]*)\]\(/g)) if (!im[1].trim()) { warn("An image has empty alt text"); break; }

  // ---- Links
  const links = [...prose.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((x) => x[1]);
  const internal = links.filter((l) => l.startsWith("/"));
  const external = links.filter((l) => /^https?:\/\//.test(l));
  if (internal.length < R.minInternalLinks) err(`Only ${internal.length} internal links (need ${R.minInternalLinks}+)`);
  for (const pre of R.requiredInternalPrefixes ?? []) if (!internal.some((l) => l.startsWith(pre))) err(`No internal link starting with ${pre}`);
  if (external.length < R.minExternalLinks) err(`Only ${external.length} inline external citations (need ${R.minExternalLinks}+ authoritative sources linked in the text)`);
  if (external.some((l) => l.startsWith("http://"))) warn("Use https for external links");
  const pillar = cfg.pillars.find((x) => x.slug === fm.pillar);
  if (type === "cluster" && pillar?.pillarPost && all.some((o) => o.slug === pillar.pillarPost) && !internal.some((l) => l === `${cfg.paths.blogUrlPrefix}${pillar.pillarPost}`))
    err(`Cluster post must link to its pillar guide ${cfg.paths.blogUrlPrefix}${pillar.pillarPost}`);
  const pre = cfg.paths.blogUrlPrefix;
  for (const l of internal) {
    if (!pre || !l.startsWith(pre)) continue;
    const s = l.slice(pre.length).replace(/[#?].*$/, "").replace(/\/$/, "");
    if (s && !all.some((o) => o.slug === s)) err(`Internal link to a post that does not exist: ${l}`);
  }
  const selfLinks = internal.filter((l) => pre && l.replace(/[#?].*$/, "") === `${pre}${p.slug}`).length;
  if (selfLinks) warn("The post links to itself");

  // ---- Sources and statistics
  const sources = Array.isArray(fm.sources) ? fm.sources : [];
  const minSrc = num(R.minSources, type, 3);
  if (sources.length < minSrc) err(`Needs ${minSrc}+ sources in frontmatter (has ${sources.length})`);
  for (const s of sources) if (!s?.url || !/^https:\/\//.test(s.url) || !s?.title) err(`Source needs an https url and a title: ${JSON.stringify(s).slice(0, 80)}`);
  const ownLabel = new RegExp(`(${(R.ownDataLabels ?? []).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "i");
  for (const para of prose.split(/\n\s*\n/)) {
    if (/^\s*(\||#|>)/.test(para)) continue;
    if (/\d+(\.\d+)?\s?%|[$€£]\s?\d/.test(para) && !/\]\(https?:\/\//.test(para) && !(R.ownDataLabels?.length && ownLabel.test(para))) {
      err(`Statistic without a cited source: "${para.trim().slice(0, 90)}…" (link the source in the same paragraph, or label it as your own data/estimate)`);
    }
  }

  // ---- Future-year edition (optional)
  const Y = cfg.yearEdition;
  if (Y.enabled && pub >= Y.from && !(Y.exempt ?? []).includes(p.slug)) {
    const yr = String(Y.year);
    const has = (v) => new RegExp(`\\b${yr}\\b`).test(String(v ?? ""));
    const hasNum = (v) => /\b\d{1,2}\b/.test(String(v ?? "").replace(new RegExp(yr, "g"), ""));
    for (const [label, v] of [["SEO title", title], ["H1", h1]]) {
      if (!has(v)) err(`${label} must contain "${yr}" (year edition)`);
      if (Y.requireNumberInTitle && !hasNum(v)) err(`${label} must contain a number: "Top 5 …", "7 Ways …", "3 Mistakes …", "A 4-Step Plan …"`);
    }
    if (Y.requireYearInDescription && !has(desc)) err(`Meta description must contain "${yr}"`);
    if (Y.requireYearInFirstParagraph && !has(firstPara)) err(`Opening paragraph must mention "${yr}"`);
    if (Y.requireYearInH2 && !h2s.some(has)) err(`At least one H2 must mention ${yr} (for example "What changes in ${yr}")`);
    const n = (prose.match(new RegExp(`\\b${yr}\\b`, "g")) || []).length;
    if (n < Y.minMentions) warn(`"${yr}" appears only ${n}x in the body; shape the post around the ${yr} reader (aim for ${Y.minMentions}–10 natural mentions)`);
    if (n > Y.maxMentions) warn(`"${yr}" appears ${n}x in the body; that reads as keyword stuffing`);
  }

  // ---- The number in a numbered headline must match the numbered H2s ("## 1. Name")
  if (Y.enabled ? pub >= Y.from : true) {
    const promised = h1.match(/\btop\s+(\d{1,2})\b/i)
      || h1.match(/\b(\d{1,2})\s+(?:[A-Za-z-]+\s+){0,2}?(?:ways|mistakes|signs|questions|tools|options|reasons|things|checks|metrics|features|myths|pitfalls|rules|tips|ideas|trends|examples|steps|lessons|habits|tactics|templates|alternatives|platforms|vendors)\b/i)
      || h1.match(/\b(\d{1,2})[- ]step\b/i);
    if (promised) {
      const numbered = (body.match(/^## +\d{1,2}\.\s+\S/gm) || []).length;
      if (numbered !== Number(promised[1])) err(`Headline promises ${promised[1]} items but the body has ${numbered} numbered H2s; write each item as "## 1. Name" … "## ${promised[1]}. Name", exactly ${promised[1]}`);
    }
  }

  // ---- Conversion structure (optional)
  const C = cfg.conversion;
  if (C.enabled && pub >= C.from) {
    if (C.requireNextStepSection && !/^## .*(30[- ]day|pilot|first step|get started|next step|how we work|what you get|what happens next)/im.test(body))
      err('Needs an H2 on the next step (for example "What a 30-day pilot delivers" or "How to get started") so readers see what contacting you gets them');
    for (const pre2 of C.requireInternalPrefix ?? []) if (!internal.some((l) => l.startsWith(pre2))) err(`Needs an in-body link to a conversion page starting with ${pre2}`);
    if (C.blockFakeUrgency && URGENCY.test(prose)) err("Fake urgency or scarcity wording; persuade with specifics and sourced facts instead");
  }

  // ---- Ratchet: match or beat the recent median on the answer-engine and trust signals
  const RT = cfg.ratchet;
  if (RT.enabled && type !== "pillar" && pub >= RT.from) {
    const bar = recentBar(all, pub, p.slug, RT.window);
    if (bar.n >= 3) for (const k of BAR_KEYS) if (m[k] < bar.median[k]) warn(`${BAR_LABEL[k]}: ${m[k]} is below the recent bar (median of the last ${bar.n} posts: ${bar.median[k]}); each post should match or beat its predecessors`);
  }

  // ---- Humanizer lint
  if (R.humanizerLint && String(cfg.site.language ?? "en").startsWith("en")) {
    const lower = prose.toLowerCase();
    for (const b of BANNED) {
      const esc = b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`${/^\w/.test(b) ? "\\b" : ""}${esc}${/\w$/.test(b) ? "\\b" : ""}`);
      if (re.test(lower)) err(`AI-slop phrase "${b}" (rewrite in plain, specific language)`);
    }
    for (const w of WARN_WORDS) {
      const n = lower.split(new RegExp(`\\b${w}\\b`)).length - 1;
      if (n > 2) warn(`Overused filler word "${w}" ×${n}`);
    }
    const dashes = (prose.match(/—/g) || []).length;
    if (dashes > R.maxEmDashes) err(`${dashes} em dashes (max ${R.maxEmDashes}; use commas, colons or full stops)`);
    const notJust = (lower.match(/\bnot (just|only) [^.]{0,60}\bbut\b/g) || []).length;
    if (notJust > 1) warn(`"Not just X but Y" construction ×${notJust}`);
    const sentences = prose.replace(/\n/g, " ").split(/(?<=[.!?])\s+/).filter((s) => s.split(" ").length > 2);
    if (sentences.length > 20) {
      const lens = sentences.map((s) => s.split(/\s+/).length);
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
      const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
      if (sd < 5) warn(`Sentence rhythm is uniform (σ=${sd.toFixed(1)} words); vary sentence length`);
      if (mean > 26) warn(`Average sentence is ${mean.toFixed(0)} words; aim for under 22`);
    }
  }
  for (const re of PLACEHOLDERS) if (re.test(body) || re.test(JSON.stringify(fm))) err(`Placeholder text matched ${re}`);

  // ---- One intent per post (anti-cannibalization)
  for (const o of all) {
    if (o.slug === p.slug || !o.fm) continue;
    if (norm(o.fm.primaryKeyword) && norm(o.fm.primaryKeyword) === kw) err(`Primary keyword "${fm.primaryKeyword}" already targeted by ${o.slug}`);
    if (norm(o.fm.question) && norm(o.fm.question) === norm(fm.question)) err(`Question duplicates ${o.slug}`);
    const sim = jaccard(`${fm.h1} ${fm.question}`, `${o.fm.h1} ${o.fm.question}`);
    if (sim >= 0.6) err(`Too similar to ${o.slug} (similarity ${sim.toFixed(2)}); pick a distinct question`);
    else if (sim >= 0.45) warn(`Overlaps with ${o.slug} (similarity ${sim.toFixed(2)})`);
  }

  // ---- Cadence
  const per = cfg.program.postsPerDay;
  const sameDay = all.filter((o) => o.fm && dateStr(o.fm.publishedAt) === pub).length;
  if (per && sameDay > per) warn(`${sameDay} posts share publishedAt ${pub} (target ${per}/day)`);

  return { E, W, words };
}

// ---------------------------------------------------------------- run
const args = process.argv.slice(2).filter((a, i, arr) => a !== "--config" && arr[i - 1] !== "--config");
const json = args.includes("--json");
const targets = args.filter((a) => !a.startsWith("--"));
const all = readPosts(cfg);
const selected = targets.length ? all.filter((p) => targets.some((t) => p.slug === t || p.file.endsWith(t) || p.slug === t.replace(/\.mdx?$/, "").split("/").pop())) : all;

let errors = 0;
const report = [];
for (const p of selected) {
  const r = checkPost(p, all);
  errors += r.E.length;
  report.push({ slug: p.slug, words: r.words, errors: r.E, warnings: r.W, score: Math.max(0, 100 - r.E.length * 15 - r.W.length * 3) });
}

if (json) console.log(JSON.stringify({ posts: report, errors }, null, 2));
else {
  console.log(`QA: ${selected.length} post(s) checked`);
  for (const r of report) {
    console.log(`\n[${r.errors.length ? "FAIL" : "PASS"}] ${r.slug}  (${r.words ?? 0} words, quality score ${r.score}/100)`);
    for (const e of r.errors) console.log(`  ✗ ${e}`);
    for (const w of r.warnings) console.log(`  ! ${w}`);
  }
  console.log(errors ? `\n✗ ${errors} blocking issue(s). Fix them before publishing.` : "\n✓ All posts pass the quality gate.");
}
process.exit(errors ? 1 : 0);
