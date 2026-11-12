#!/usr/bin/env node
// Build an llms.txt index and clean Markdown copies of every post, for AI assistants and crawlers.
//
//   node scripts/llms-txt.mjs [--out out] [--summary "One sentence about the site."]
//
// Writes <out>/llms.txt and <out>/md/<slug>.md. Publish llms.txt at /llms.txt and, if you like, the
// Markdown copies at <post-url>.md. llms.txt is an informal community convention, not a standard that
// any search engine has promised to use: treat it as a cheap extra, not a ranking lever.

import fs from "node:fs";
import path from "node:path";
import { loadConfig, readPosts } from "./lib.mjs";

const cfg = loadConfig();
const flag = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const out = path.resolve(cfg.root, flag("--out") ?? "out");
const summary = flag("--summary") ?? cfg.site.description ?? `Articles from ${cfg.site.name}.`;
const base = cfg.site.url.replace(/\/$/, "");
const prefix = cfg.paths.blogUrlPrefix;

const posts = readPosts(cfg).filter((p) => p.fm && p.fm.draft !== true)
  .sort((a, b) => String(b.fm.publishedAt).localeCompare(String(a.fm.publishedAt)));

fs.mkdirSync(path.join(out, "md"), { recursive: true });
const lines = [`# ${cfg.site.name}`, "", `> ${summary}`, ""];
for (const pl of cfg.pillars.filter((p) => p.status !== "retired")) {
  const mine = posts.filter((p) => p.fm.pillar === pl.slug);
  if (!mine.length) continue;
  lines.push(`## ${pl.name}`, "");
  for (const p of mine) lines.push(`- [${p.fm.h1}](${base}${prefix}${p.slug}.md): ${p.fm.description}`);
  lines.push("");
}
fs.writeFileSync(path.join(out, "llms.txt"), lines.join("\n"));

for (const p of posts) {
  const f = p.fm;
  const md = [
    `# ${f.h1}`, "", `> ${f.description}`, "",
    `Published: ${String(f.publishedAt).slice(0, 10)}${f.updatedAt ? ` · Updated: ${String(f.updatedAt).slice(0, 10)}` : ""}`, "",
    ...(Array.isArray(f.takeaways) && f.takeaways.length ? ["## Key takeaways", "", ...f.takeaways.map((t) => `- ${t}`), ""] : []),
    p.body.trim(), "",
    ...(Array.isArray(f.faqs) && f.faqs.length ? ["## Frequently asked questions", "", ...f.faqs.flatMap((q) => [`### ${q.q}`, "", q.a, ""])] : []),
    ...(Array.isArray(f.sources) && f.sources.length ? ["## Sources", "", ...f.sources.map((s) => `- [${s.title}](${s.url})${s.publisher ? ` (${s.publisher})` : ""}`), ""] : []),
  ].join("\n");
  fs.writeFileSync(path.join(out, "md", `${p.slug}.md`), md);
}
console.log(`Wrote ${path.join(out, "llms.txt")} and ${posts.length} Markdown copies in ${path.join(out, "md")}`);
