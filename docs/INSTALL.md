# Install

The skill is the folder `skill/automated-seo-aeo-anysite/` (also packaged as `dist/automated-seo-aeo-anysite.zip`). It contains `SKILL.md`, `references/`, `templates/` and `scripts/`.

## Option A: Claude.ai or Claude desktop (skills)
1. Download this repository (Code → Download ZIP) or just the file `dist/automated-seo-aeo-anysite.zip`.
2. Open Claude's skill or capability settings and upload `automated-seo-aeo-anysite.zip`. (The zip's top-level folder is the skill folder, which is what skill uploads expect.)
3. Start a new chat and say: **"Digest this skill and set up my SEO engine."**

Skill menus change between releases. If you cannot find the upload option, use Option C.

## Option B: Claude Code
Copy the folder, not the repo:

```bash
# all your projects
mkdir -p ~/.claude/skills && cp -r skill/automated-seo-aeo-anysite ~/.claude/skills/

# or one project only
mkdir -p .claude/skills && cp -r skill/automated-seo-aeo-anysite .claude/skills/
```

Open Claude Code in the folder where your site's content lives and say: **"Digest this skill and set up my SEO engine."** Claude will run the scripts for you (Node 18 or newer is required; no packages).

## Option C: any chat, no skills feature
1. Start a conversation and paste the contents of `skill/automated-seo-aeo-anysite/SKILL.md`.
2. When Claude asks to open a playbook, paste the matching file from `references/`.
3. If the chat cannot run code, Claude follows the same steps by hand and tells you the automatic quality gate did not run.

## Check that it works
Ask Claude: "What stages will you walk me through?" You should get five: interview, keywords, strategy, daily run, learn. Then answer the first interview questions.

## Where your files go
Claude works in a **workspace folder** for your site:

```
my-site/
├── seo.config.json        # settings, authors, pillars, rules
├── strategy/              # STRATEGY.md, backlog.json, keywords.json, LEARNINGS.md
└── content/posts/         # one Markdown file per post
```

Keep it in git if you can: the memory file (`LEARNINGS.md`) and the backlog are how the program gets better over time.

## Updating the skill
Download the new release and replace the skill folder. Your workspace files are separate and are not touched.
