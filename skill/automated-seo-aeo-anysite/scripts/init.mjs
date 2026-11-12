#!/usr/bin/env node
// Scaffold a content workspace in the current folder (never overwrites existing files).
//
//   node <path-to-skill>/scripts/init.mjs --name "My Site" --url https://example.com [--year 2027] [--per-day 3] [--lang en]
//
// Creates: seo.config.json, strategy/{LEARNINGS.md,backlog.json,STRATEGY.md}, content/posts/
// The assistant then fills seo.config.json (authors, pillars) from the intake interview.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const tpl = path.join(here, "..", "templates");
const flag = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const name = flag("--name", "My Site");
const url = flag("--url", "https://example.com");
const year = flag("--year");
const perDay = Number(flag("--per-day", 3));
const lang = flag("--lang", "en");
const dir = path.resolve(flag("--dir", "."));

const made = [], kept = [];
function put(rel, content) {
  const p = path.join(dir, rel);
  if (fs.existsSync(p)) { kept.push(rel); return; }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  made.push(rel);
}

const cfg = JSON.parse(fs.readFileSync(path.join(tpl, "seo.config.json"), "utf8"));
cfg.site = { ...cfg.site, name, url, language: lang };
cfg.program.postsPerDay = perDay;
cfg.program.startDate = new Date().toISOString().slice(0, 10);
if (year) { cfg.yearEdition.enabled = true; cfg.yearEdition.year = Number(year); cfg.yearEdition.from = cfg.program.startDate; }
cfg.conversion.from = cfg.program.startDate;
cfg.ratchet.from = cfg.program.startDate;
put("seo.config.json", JSON.stringify(cfg, null, 2) + "\n");
put("strategy/LEARNINGS.md", fs.readFileSync(path.join(tpl, "learnings.md"), "utf8"));
put("strategy/backlog.json", JSON.stringify({ topics: [] }, null, 2) + "\n");
put("strategy/STRATEGY.md", `# Strategy for ${name}\n\n(Filled in by the assistant after the intake interview: audience, goal, pillars, keyword focus, voice, conversion path.)\n`);
put("content/posts/.gitkeep", "");

console.log(made.length ? `Created: ${made.join(", ")}` : "Nothing to create.");
if (kept.length) console.log(`Kept existing: ${kept.join(", ")}`);
console.log("Next: complete the intake interview so authors, pillars and the keyword backlog can be filled in.");
