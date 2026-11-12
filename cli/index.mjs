#!/usr/bin/env node
// Command-line entry point: `npx automated-seo-aeo-anysite <command> [options]`.
// Zero dependencies, Node 18+. Each workspace command runs the matching script in
// skill/automated-seo-aeo-anysite/scripts/ from the current folder, so it behaves exactly like
// `node <path-to-skill>/scripts/<command>.mjs`.
//
// (This folder is called cli/ and not bin/ on purpose: a top-level bin/ folder stops claude.ai from
// installing the repository as a plugin.)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_NAME = "automated-seo-aeo-anysite";
const skillDir = path.join(root, "skill", SKILL_NAME);
const scriptsDir = path.join(skillDir, "scripts");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const SCRIPTS = {
  init: "Create seo.config.json, strategy/ and content/posts/ here (never overwrites)",
  keywords: "Read Keyword Planner / Trends / Search Console exports; score and cluster",
  plan: "Today's plan: posts due, batch plan, quality bar, recent lessons",
  qa: "Run the quality gate on every post (exit code 1 on errors)",
  schema: "Print JSON-LD for a post",
  "llms-txt": "Write llms.txt and clean Markdown copies of every post",
};

function help() {
  const w = Math.max(...Object.keys(SCRIPTS).map((k) => k.length), "install".length) + 2;
  const row = (k, v) => `  ${k.padEnd(w)}${v}`;
  return [
    `${SKILL_NAME} ${pkg.version}`,
    "",
    `Usage: npx ${SKILL_NAME} <command> [options]`,
    "",
    "Set up the skill:",
    row("install", "Copy the skill to ~/.claude/skills (use --project for ./.claude/skills, --force to replace)"),
    row("path", "Print the folder that holds SKILL.md"),
    "",
    "Workspace commands (run them in your site's content folder):",
    ...Object.entries(SCRIPTS).map(([k, v]) => row(k, v)),
    "",
    "Each workspace command takes the same options as its script, for example:",
    `  npx ${SKILL_NAME} init --name "Acme Gardens" --url https://acme.example --year 2027`,
    `  npx ${SKILL_NAME} qa --json`,
    "",
    "Docs: https://github.com/ahmadkhancodes/automated-seo-aeo-anysite",
  ].join("\n");
}

function install(args) {
  const project = args.includes("--project");
  const force = args.includes("--force");
  const base = project ? path.resolve(".claude", "skills") : path.join(os.homedir(), ".claude", "skills");
  const dest = path.join(base, SKILL_NAME);
  if (fs.existsSync(dest)) {
    if (!force) {
      console.error(`${dest} already exists. Re-run with --force to replace it with version ${pkg.version}.`);
      return 1;
    }
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.mkdirSync(base, { recursive: true });
  fs.cpSync(skillDir, dest, { recursive: true, filter: (src) => path.basename(src) !== ".DS_Store" });
  console.log(`Installed ${SKILL_NAME} ${pkg.version} to ${dest}`);
  console.log('Open Claude Code in your site folder and say: "Digest this skill and set up my SEO engine."');
  return 0;
}

function main(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(help());
    return 0;
  }
  if (cmd === "--version" || cmd === "-v" || cmd === "version") {
    console.log(pkg.version);
    return 0;
  }
  if (cmd === "path") {
    console.log(skillDir);
    return 0;
  }
  if (cmd === "install") return install(rest);
  if (Object.hasOwn(SCRIPTS, cmd)) {
    const r = spawnSync(process.execPath, [path.join(scriptsDir, `${cmd}.mjs`), ...rest], { stdio: "inherit" });
    if (r.error) {
      console.error(r.error.message);
      return 1;
    }
    return r.status ?? 1;
  }
  console.error(`Unknown command: ${cmd}\n`);
  console.error(help());
  return 1;
}

process.exitCode = main(process.argv.slice(2));
