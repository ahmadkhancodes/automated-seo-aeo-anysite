// Shared helpers for the automated-seo-aeo-anysite scripts. Zero dependencies, Node 18+.
// - parseFrontmatter: a small YAML-subset parser (scalars, inline lists, block lists, lists of maps, block scalars)
// - loadConfig: seo.config.json with defaults
// - readPosts / metricsOf / recentBar: shared by the QA gate and the planner

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------- YAML subset
function readQuoted(s) {
  // s starts with " or '. Returns [value, restAfterClosingQuote] or null when unterminated.
  const q = s[0];
  for (let i = 1; i < s.length; i++) {
    if (q === '"' && s[i] === "\\") { i++; continue; }
    if (s[i] === q) {
      if (q === "'" && s[i + 1] === "'") { i++; continue; }
      const raw = s.slice(0, i + 1);
      let val;
      if (q === '"') { try { val = JSON.parse(raw); } catch { val = raw.slice(1, -1); } }
      else val = raw.slice(1, -1).replace(/''/g, "'");
      return [val, s.slice(i + 1)];
    }
  }
  return null;
}

function splitInline(s) {
  // split "a, "b, c", d" on top-level commas
  const out = []; let cur = ""; let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === "\\" && q === '"') { cur += s[++i] ?? ""; } else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === ",") { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim() !== "") out.push(cur);
  return out;
}

function scalar(s) {
  s = s.trim();
  if (s === "") return "";
  if (s[0] === '"' || s[0] === "'") { const r = readQuoted(s); if (r) return r[0]; }
  if (s[0] === "[" && s.endsWith("]")) return splitInline(s.slice(1, -1)).map(scalar);
  s = s.replace(/\s+#.*$/, "");
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null" || s === "~") return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

const indentOf = (l) => l.match(/^ */)[0].length;

function parseBlock(lines, i, indent) {
  // returns [value, nextIndex]
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return [null, i];
  if (lines[i].trim().startsWith("- ") || lines[i].trim() === "-") return parseList(lines, i, indent);
  return parseMap(lines, i, indent);
}

function parseList(lines, i, indent) {
  const arr = [];
  while (i < lines.length) {
    if (lines[i].trim() === "") { i++; continue; }
    const ind = indentOf(lines[i]);
    const t = lines[i].trim();
    if (ind < indent || !(t.startsWith("- ") || t === "-")) break;
    const rest = t === "-" ? "" : t.slice(2);
    if (rest === "") { const [v, n] = parseBlock(lines, i + 1, ind + 2); arr.push(v); i = n; continue; }
    const keyLike = /^(?:"[^"]*"|'[^']*'|[^\s"'\[{#][^:]*?):(?:\s|$)/.test(rest);
    if (keyLike) {
      // map item: rewrite "- key: v" as "  key: v" and parse a map at ind+2
      const copy = lines.slice();
      copy[i] = " ".repeat(ind + 2) + rest;
      const [v, n] = parseMap(copy, i, ind + 2);
      arr.push(v); i = n; continue;
    }
    // scalar item, possibly a quoted string continued on following lines
    let val = rest;
    if ((val[0] === '"' || val[0] === "'") && !readQuoted(val)) {
      let j = i + 1;
      while (j < lines.length && !readQuoted(val)) { val += " " + lines[j].trim(); j++; }
      i = j - 1;
    }
    arr.push(scalar(val));
    i++;
  }
  return [arr, i];
}

function parseMap(lines, i, indent) {
  const obj = {};
  while (i < lines.length) {
    if (lines[i].trim() === "" || lines[i].trim().startsWith("#")) { i++; continue; }
    const ind = indentOf(lines[i]);
    if (ind < indent) break;
    if (ind > indent) throw new Error(`Unexpected indentation at: ${lines[i].trim().slice(0, 60)}`);
    const t = lines[i].trim();
    let key, rest;
    const m = t.match(/^("(?:[^"\\]|\\.)*"|'[^']*'|[^:]+?):(?:\s+(.*))?$/);
    if (!m) throw new Error(`Cannot parse line: ${t.slice(0, 60)}`);
    key = m[1].replace(/^["']|["']$/g, ""); rest = (m[2] ?? "").trim();
    if (rest === "") {
      // nested block (deeper indent) or a list at the same indent
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (j < lines.length && (indentOf(lines[j]) > indent || (indentOf(lines[j]) === indent && lines[j].trim().startsWith("- ")))) {
        const [v, n] = parseBlock(lines, j, indentOf(lines[j]));
        obj[key] = v; i = n;
      } else { obj[key] = null; i++; }
      continue;
    }
    if (/^[|>][+-]?$/.test(rest)) {
      const fold = rest[0] === ">";
      const buf = []; let j = i + 1;
      let bi = null;
      while (j < lines.length && (lines[j].trim() === "" || indentOf(lines[j]) > indent)) {
        if (bi === null && lines[j].trim() !== "") bi = indentOf(lines[j]);
        buf.push(lines[j].slice(bi ?? 0)); j++;
      }
      obj[key] = fold ? buf.join(" ").replace(/\s+/g, " ").trim() : buf.join("\n").replace(/\n+$/, "");
      i = j; continue;
    }
    let val = rest;
    if ((val[0] === '"' || val[0] === "'") && !readQuoted(val)) {
      let j = i + 1;
      while (j < lines.length && !readQuoted(val)) { val += " " + lines[j].trim(); j++; }
      i = j;
    } else {
      i++;
      // plain scalar folded over more-indented continuation lines
      while (i < lines.length && lines[i].trim() !== "" && indentOf(lines[i]) > indent && val[0] !== "[" && !/^[-\w"'].*:\s/.test(lines[i].trim()) && !lines[i].trim().startsWith("- ")) { val += " " + lines[i].trim(); i++; }
    }
    obj[key] = scalar(val);
  }
  return [obj, i];
}

export function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: null, body: raw, error: "Missing YAML frontmatter" };
  try {
    const lines = m[1].replace(/\t/g, "  ").split(/\r?\n/);
    const [fm] = parseMap(lines, 0, 0);
    return { fm, body: m[2], error: null };
  } catch (e) {
    return { fm: {}, body: m[2], error: `Frontmatter parse error: ${e.message}` };
  }
}

// ---------------------------------------------------------------- config
export const DEFAULT_CONFIG = {
  site: { name: "Example Co", url: "https://example.com", language: "en" },
  paths: { posts: "content/posts", strategy: "strategy", blogUrlPrefix: "/blog/" },
  program: { postsPerDay: 3, maxPerRun: 4 },
  authors: {},
  pillars: [],
  rules: {
    titleMax: 60, descriptionMin: 120, descriptionMax: 160,
    minWords: { cluster: 1200, pillar: 3000 }, minH2: { cluster: 4, pillar: 6 },
    minFaqs: { cluster: 3, pillar: 5 }, minSources: { cluster: 3, pillar: 6 },
    minInternalLinks: 3, minExternalLinks: 2, minTakeaways: 3, maxTakeaways: 6,
    requireVisual: true, maxEmDashes: 4, requireReviewer: false,
    requiredInternalPrefixes: [],
    ownDataLabels: ["our data", "our estimate", "our experience", "our benchmark", "our delivery data"],
    humanizerLint: true,
  },
  yearEdition: {
    enabled: false, year: new Date().getFullYear() + 1, from: "2000-01-01", exempt: [],
    requireNumberInTitle: true, requireYearInDescription: true, requireYearInFirstParagraph: true, requireYearInH2: true,
    minMentions: 3, maxMentions: 14,
  },
  conversion: { enabled: false, from: "2000-01-01", requireNextStepSection: true, requireInternalPrefix: [], blockFakeUrgency: true },
  ratchet: { enabled: true, window: 5, from: "2000-01-01" },
};

const deepMerge = (a, b) => {
  if (Array.isArray(b) || typeof b !== "object" || b === null) return b === undefined ? a : b;
  const out = { ...a };
  for (const k of Object.keys(b)) out[k] = k in a && typeof a[k] === "object" && !Array.isArray(a[k]) ? deepMerge(a[k], b[k]) : b[k];
  return out;
};

export function loadConfig(argv = process.argv) {
  const i = argv.indexOf("--config");
  const file = i >= 0 ? argv[i + 1] : path.join(process.cwd(), "seo.config.json");
  let user = {};
  if (fs.existsSync(file)) {
    try { user = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.error(`seo.config.json is not valid JSON: ${e.message}`); process.exit(2); }
  } else {
    console.error(`No seo.config.json found at ${file}. Run: node scripts/init.mjs --name "My Site" --url https://example.com`);
    process.exit(2);
  }
  const cfg = deepMerge(DEFAULT_CONFIG, user);
  cfg.root = path.dirname(path.resolve(file));
  return cfg;
}

// ---------------------------------------------------------------- posts
export const dateStr = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").slice(0, 10));
export const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

export function readPosts(cfg) {
  const dir = path.resolve(cfg.root, cfg.paths.posts);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.mdx?$/.test(f)).map((f) => {
    const file = path.join(dir, f);
    const { fm, body, error } = parseFrontmatter(fs.readFileSync(file, "utf8"));
    return { file, slug: f.replace(/\.mdx?$/, ""), fm, body, error };
  });
}

// ---------------------------------------------------------------- metrics and the quality "ratchet"
export const BAR_KEYS = ["sources", "external", "internal", "faqs", "visuals", "tables", "questionH2"];
export const BAR_LABEL = {
  sources: "frontmatter sources", external: "inline external citations", internal: "internal links",
  faqs: "FAQs", visuals: "visual elements (tables, images, charts)", tables: "tables", questionH2: "question-shaped H2s (answer engines)",
};

export function proseOf(body) { return body.replace(/```[\s\S]*?```/g, " "); }

export function metricsOf(fm, body) {
  const prose = proseOf(body);
  const links = [...prose.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]);
  const tables = (prose.match(/^\|.*\|[ \t]*\n\|[\s:|-]+\|/gm) || []).length;
  const images = (prose.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
  const charts = (body.match(/```(?:chart|infographic|mermaid)/g) || []).length;
  return {
    sources: Array.isArray(fm?.sources) ? fm.sources.length : 0,
    external: links.filter((l) => /^https?:\/\//.test(l)).length,
    internal: links.filter((l) => l.startsWith("/")).length,
    faqs: Array.isArray(fm?.faqs) ? fm.faqs.length : 0,
    visuals: tables + images + charts,
    tables,
    questionH2: (body.match(/^## .*\?\s*$/gm) || []).length,
    words: prose.split(/\s+/).filter(Boolean).length,
  };
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Median metrics of the n most recent cluster posts published on or before `beforeDate`, excluding `excludeSlug`. */
export function recentBar(posts, beforeDate, excludeSlug, n = 5) {
  const rows = posts
    .filter((p) => p.fm && p.slug !== excludeSlug && p.fm.draft !== true && p.fm.type !== "pillar" && dateStr(p.fm.publishedAt) <= beforeDate)
    .map((p) => ({ date: dateStr(p.fm.publishedAt), slug: p.slug, m: metricsOf(p.fm, p.body) }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
    .slice(0, n);
  const bar = { n: rows.length, median: {} };
  for (const k of [...BAR_KEYS, "words"]) bar.median[k] = rows.length ? median(rows.map((r) => r.m[k])) : 0;
  return bar;
}

export const today = () => new Date().toISOString().slice(0, 10);
export const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
