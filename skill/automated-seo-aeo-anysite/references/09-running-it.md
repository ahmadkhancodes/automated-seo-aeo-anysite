# 09. Running it: schedules, cost and monitoring

## Three ways to run
1. **By hand:** open the workspace, say "run today's batch", review the posts, publish. Best for the first week.
2. **Scheduled in your agent tool:** if your tool supports scheduled tasks, schedule one daily batch run and one nightly catch-up run (same prompt; the planner publishes only what is missing).
3. **Cron plus a command-line agent:** run the agent in headless mode with the batch prompt from a scheduler (cron, a hosted scheduler or a CI workflow), in a checkout of the content repository with credentials the owner controls.

Whatever you choose, keep a human approval step until the owner has read at least the first ten posts and trusts the output. The planner's catch-up rule (target for yesterday plus today, minus what is published, capped by `maxPerRun`) means a missed run is made up by the next one.

## A batch prompt that works
> Run today's content batch. Run `node scripts/plan.mjs`. If it says nothing is due, reply "Nothing due". Otherwise follow `references/03-post-pipeline.md`: evidence packs first, then write the posts in order, each better than the last, run `node scripts/qa.mjs`, publish by the approved method, append lessons to `strategy/LEARNINGS.md`. Reply in at most five lines: each post (title, URL, QA score), the improvement added, and any problem.

## Cost and cache habits
- **Write the day's posts in one batch** inside one context: the skill text, strategy and memory file are read once and reused (cached) for every post, instead of being re-read per run.
- **Put stable text first** (skill, strategy, memory) and topic-specific text after it; do not edit those files in the middle of a batch.
- **Use a fast, low-cost model for research and evidence gathering and a stronger one for writing and fact-checking.** Ask helpers for short reports (a file path and two lines).
- **Do not paste whole files into the conversation** when a script prints the summary (`plan.mjs`, `qa.mjs`).
- **Rotate long sessions.** A session that has grown very large is re-read on every turn. When it gets big, start a fresh one; all state lives in the workspace files, so nothing is lost.
- **Fewer, better posts** cost less and rank better than many thin ones.

## Publishing paths
- **Git-based sites (static generators, Next.js, etc.):** commit the Markdown, push, let the host build. Run the gate before committing.
- **WordPress and other CMSs:** hand over the Markdown and the JSON-LD from `schema.mjs`, or push through the CMS API with a draft status so the owner approves.
- **Copy and paste:** produce the Markdown, the title and description, and the JSON-LD block together.

## Monitoring (weekly)
Search Console: impressions, clicks, average position per page and per query; coverage and indexing; any manual action notices. Compare 4 weeks against the previous 4. Ignore daily noise. Rankings take weeks to settle, and no tool can promise a position.

## Troubleshooting
| Symptom | Likely cause | Fix |
|---|---|---|
| `No seo.config.json found` | scripts run outside the workspace | `cd` into the workspace or pass `--config path` |
| `Unknown author` | the author slug is not in `seo.config.json` | add the real author, or fix the slug |
| `Headline promises N items` | numbered H2s do not match the title | write exactly N `## 1. Name` headings |
| Statistic without a cited source | a % or $ figure with no link in the paragraph | link the source or label it as your own data |
| Too similar to another post | overlapping intent | change the question and angle, or merge the posts |
| Keyword file not recognised | an unusual export format | open the file, check the header row, or re-export from the tool |
| Quality bar warnings on every post | the recent posts are stronger than the new one | add sources, tables, question H2s and FAQs before publishing |
