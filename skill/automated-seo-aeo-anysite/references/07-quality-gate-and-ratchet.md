# 07. The quality gate and the "ratchet"

## The gate (`scripts/qa.mjs`)
Run `node scripts/qa.mjs` (all posts) or `node scripts/qa.mjs <slug>`. Errors block publishing and the exit code is 1. Warnings lower the score by 3 each; each error by 15. Aim for zero of both.

What it checks (every threshold lives in `seo.config.json`):
- **Metadata:** required fields, title and description length, known author, reviewer, a real `originality` statement, the primary keyword present in the title or H1.
- **Answer-first structure:** 3 to 6 takeaways, FAQs, an opening paragraph that answers directly, word count and H2 count by post type.
- **Evidence:** 3 or more frontmatter sources with https URLs, 2 or more inline external citations, and no paragraph with a % or currency figure unless it links a source or carries an own-data label ("our data", "our estimate").
- **Links:** minimum internal links, required internal prefixes, a link to the pillar guide for cluster posts, no links to posts that do not exist.
- **Visuals:** at least one table, image with alt text, or chart block.
- **Human-sounding prose:** a list of stock phrases that read as machine-written (errors), overused filler words (warnings), em-dash cap, "not just X but Y" pattern, uniform sentence rhythm, placeholder text.
- **One intent per post:** the same primary keyword or question as another post is an error; high similarity is an error or warning.
- **Numbered headlines:** the number in the title must equal the number of numbered H2s.
- **Year edition** and **conversion structure** (when enabled): see `05` and `06`.
- **Cadence:** a warning when more posts share a date than the daily target.

The gate is a floor, not a ceiling. A post can pass and still be dull. Read it as a reader would.

## The ratchet: every post beats the last
`recentBar` (in `lib.mjs`) takes the median of the last 5 cluster posts on seven signals: frontmatter sources, inline external citations, internal links, FAQs, visual elements, tables and question-shaped H2s. A new post below the median on any of them gets a warning. `plan.mjs` prints the bar before each run. Because the median follows the recent posts, quality can only drift up as long as new posts keep meeting it.

On top of the bar, each post adds **one improvement from the menu** in `strategy/LEARNINGS.md` that the previous post in the batch did not use (for example: a quotable attributed statistic per section, a definition in the first 100 words, a limitations paragraph, a "when to choose X vs Y" sentence, a freshness line). Tell the owner which improvement each post added.

## The memory file (`strategy/LEARNINGS.md`)
- **Playbook:** rules learned so far (for example "this vendor's site does not load: use their API spec").
- **Menu:** the SEO, AEO and GEO improvements to rotate through.
- **Lessons log:** one line per post (`date | slug | what the gate or fact-check caught | what to do better`). `plan.mjs` shows the last six. When the log passes 30 lines, merge repeated lessons into the Playbook and delete the old lines.

Keep the file in the repository (or the workspace) so every new session starts with what the last one learned. Do not store secrets or unverified claims in it.

## Weekly review (10 minutes)
1. Run `plan.mjs` and compare the quality bar with last week's.
2. Read the lessons log; promote repeated lessons to the Playbook.
3. Check Search Console: impressions, clicks, average position by post; refresh striking-distance pages; stop clusters that earn nothing after eight weeks.
4. Re-run `keywords.mjs` with fresh exports once a month and re-order the backlog.
