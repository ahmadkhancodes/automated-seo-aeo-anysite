// Smoke tests. Run with: npm test   (node --test tests/run.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../skill/automated-seo-aeo-anysite/scripts/lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const S = path.join(root, "skill", "automated-seo-aeo-anysite", "scripts");
const run = (script, args = [], cwd = root) => spawnSync(process.execPath, [path.join(S, script), ...args], { cwd, encoding: "utf8" });
const example = path.join(root, "examples", "workspace");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "seo-test-"));

test("frontmatter parser handles scalars, inline lists, block lists and lists of maps", () => {
  const { fm, error } = parseFrontmatter(`---
title: "A: title, with punctuation"
n: 3
ok: true
tags: ["a, b", c]
items:
  - one
  - "two"
faqs:
  - q: "Why?"
    a: "Because."
  - q: Second
    a: Answer two
note: >
  folded
  text
---
body`);
  assert.equal(error, null);
  assert.equal(fm.title, "A: title, with punctuation");
  assert.equal(fm.n, 3);
  assert.equal(fm.ok, true);
  assert.deepEqual(fm.tags, ["a, b", "c"]);
  assert.deepEqual(fm.items, ["one", "two"]);
  assert.deepEqual(fm.faqs, [{ q: "Why?", a: "Because." }, { q: "Second", a: "Answer two" }]);
  assert.equal(fm.note, "folded text");
});

test("the example post passes the quality gate", () => {
  const r = run("qa.mjs", [], example);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /All posts pass/);
});

test("a thin post fails with specific errors", () => {
  const dir = tmp();
  run("init.mjs", ["--name", "T", "--url", "https://t.example", "--year", "2027"], dir);
  fs.writeFileSync(path.join(dir, "content/posts/thin-post.md"), `---
title: "Thin"
h1: "Thin"
description: "short"
pillar: x
type: cluster
primaryKeyword: thin
question: q
publishedAt: ${new Date().toISOString().slice(0, 10)}
author: nobody
originality: short
---
Delve into the seamless world of content. We grew 40% last year.
`);
  const r = run("qa.mjs", ["thin-post"], dir);
  assert.equal(r.status, 1);
  for (const re of [/Meta description is/, /takeaways must have/, /Needs at least 3 FAQs/, /AI-slop phrase "delve"/, /Statistic without a cited source/, /must contain "2027"/]) assert.match(r.stdout, re);
});

test("banned phrases use word boundaries: 'as an AI-written' is fine, 'As an AI language model' is not", () => {
  const dir = tmp();
  run("init.mjs", ["--name", "T", "--url", "https://t.example"], dir);
  const mk = (txt) => fs.writeFileSync(path.join(dir, "content/posts/p.md"), `---\ntitle: "T"\n---\n${txt}`);
  mk("A human farm is as exposed as an AI-written one.");
  assert.doesNotMatch(run("qa.mjs", ["p"], dir).stdout, /AI-slop phrase "as an ai/);
  mk("As an AI language model, I can help.");
  assert.match(run("qa.mjs", ["p"], dir).stdout, /AI-slop phrase "as an ai language model"/);
});

test("numbered headline must match numbered H2s", () => {
  const dir = tmp();
  run("init.mjs", ["--name", "T", "--url", "https://t.example"], dir);
  const src = fs.readFileSync(path.join(example, "content/posts/ai-assisted-blog-posts-spam-policies.md"), "utf8");
  const broken = src.replace("## 5. Never fake freshness or stuff keywords", "## Never fake freshness or stuff keywords");
  fs.writeFileSync(path.join(dir, "content/posts/p.md"), broken);
  fs.copyFileSync(path.join(example, "seo.config.json"), path.join(dir, "seo.config.json"));
  const r = run("qa.mjs", ["p"], dir);
  assert.match(r.stdout, /Headline promises 5 items but the body has 4 numbered H2s/);
});

test("keywords.mjs reads a UTF-16 Keyword Planner export, Trends and Search Console files", () => {
  const f = (n) => path.join(root, "tests", "fixtures", n);
  const out = path.join(tmp(), "kw.json");
  const r = run("keywords.mjs", ["--in", f("keyword-planner-sample.csv"), f("trends-related-sample.csv"), f("gsc-queries-sample.csv"), "--out", out, "--top", "5"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /planner, 9 rows/);
  assert.match(r.stdout, /trends-related/);
  assert.match(r.stdout, /striking distance/);
  const j = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.ok(j.rows.length >= 12);
  assert.ok(j.clusters[0].head.startsWith("compost"));
  assert.ok(j.rows.find((x) => x.keyword === "indoor compost bin")?.breakout);
});

test("init.mjs scaffolds a workspace and never overwrites", () => {
  const dir = tmp();
  const a = run("init.mjs", ["--name", "Acme", "--url", "https://acme.example", "--year", "2027"], dir);
  assert.match(a.stdout, /Created: seo\.config\.json/);
  const cfgPath = path.join(dir, "seo.config.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  assert.equal(cfg.site.name, "Acme");
  assert.equal(cfg.yearEdition.enabled, true);
  fs.writeFileSync(cfgPath, JSON.stringify({ ...cfg, site: { ...cfg.site, name: "Edited" } }));
  const b = run("init.mjs", ["--name", "Other"], dir);
  assert.match(b.stdout, /Kept existing/);
  assert.equal(JSON.parse(fs.readFileSync(cfgPath, "utf8")).site.name, "Edited");
});

test("plan.mjs prints the catch-up rule, batch plan and quality bar", () => {
  const r = run("plan.mjs", ["--per-day", "3"], example);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Catch-up rule/);
  assert.match(r.stdout, /QUALITY BAR/);
});

test("schema.mjs emits BlogPosting, BreadcrumbList, ItemList and FAQPage", () => {
  const r = run("schema.mjs", ["ai-assisted-blog-posts-spam-policies"], example);
  assert.equal(r.status, 0, r.stderr);
  const types = JSON.parse(r.stdout)["@graph"].map((x) => x["@type"]);
  assert.deepEqual(types, ["BlogPosting", "BreadcrumbList", "ItemList", "FAQPage"]);
  const noFaq = JSON.parse(run("schema.mjs", ["ai-assisted-blog-posts-spam-policies", "--no-faq"], example).stdout)["@graph"].map((x) => x["@type"]);
  assert.ok(!noFaq.includes("FAQPage"));
});

test("llms-txt.mjs writes llms.txt and Markdown copies", () => {
  const out = path.join(tmp(), "out");
  const r = run("llms-txt.mjs", ["--out", out], example);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(out, "llms.txt")));
  assert.ok(fs.existsSync(path.join(out, "md", "ai-assisted-blog-posts-spam-policies.md")));
});

test("no brand or personal strings leak into the repository", () => {
  const banned = [/buffer\s?sol/i, /sufyan/i, /done[- ]for[- ]you/i, /ahmad/i];
  const skip = new Set([".git", "node_modules", "dist"]);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (skip.has(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(root)) {
    if (f === path.join(root, "tests", "run.mjs")) continue; // this file lists the banned patterns
    const t = fs.readFileSync(f, "utf8");
    for (const re of banned) assert.doesNotMatch(t, re, `${path.relative(root, f)} matches ${re}`);
  }
});
