# 02. Keyword research and strategy

## Getting the data (tell the owner exactly how)

**Google Keyword Planner** (free with a Google Ads account; you do not need to run ads)
1. Google Ads → Tools → Planning → Keyword Planner → "Discover new keywords".
2. Enter 3 to 10 seed terms or the site's URL, choose the country and language.
3. "Download keyword ideas" as CSV. The file may be UTF-16 and tab-separated: `keywords.mjs` handles both. Without active ad spend, Google may show wide volume ranges ("1K – 10K"); the script keeps the low bound and flags the range.

**Google Trends**
1. trends.google.com → Explore → add up to five terms, set the country and a 12-month range.
2. Download "Interest over time" and "Related queries" (Top and Rising) as CSV.

**Google Search Console** (only if the site already exists)
1. Performance → Search results → set the last 3 to 6 months → Export → CSV, and keep the "Queries" file.

Run: `node scripts/keywords.mjs --in planner.csv trends.csv queries.csv --top 40 --clusters 8 --out strategy/keywords.json`
Optional filters: `--focus "term,term"`, `--exclude "free,jobs,login"`, `--min-volume 100`.

**No exports?** Say so. Use web search to see who ranks for the seed terms, note the related searches and "people also ask" questions, and build the list from those. Mark every volume "unverified" and ask for an export when they have one. Never invent search volumes.

## Reading the output
- `value` = monthly searches × top-of-page bid: a rough proxy for commercial value. It is not revenue. Use it to sort, then apply judgement.
- `stage`: **buyer** (comparing, pricing, "best", "vs", "alternative"), **learn** (how, what, guide, template), **solution** (the thing itself). Buyer-stage posts bring the most valuable clicks and need the most careful facts.
- `strikingDistance` (Search Console, positions 8 to 30): refresh these existing pages before writing new ones; it is the cheapest win.
- Trends "Breakout" and "Rising": early topics. Use them for the year-edition angle, and check that the volume is real before committing.

## From keywords to pillars
1. Pick 3 to 6 **pillars**: broad topics the owner can credibly cover and that map to something they sell. Each pillar gets one **pillar guide** (3,000+ words, the hub) and many **cluster posts** (1,200 to 2,200 words, one question each).
2. Score each candidate pillar: demand (total volume), fit (does it lead to the offer?), credibility (can the owner say something original?), competition (who ranks, how strong). Drop pillars that fail fit or credibility even when the volume is big.
3. Write the pillars into `seo.config.json` (`slug`, `name`, `status: active`, `pillarPost`).

## The backlog (`strategy/backlog.json`)
One entry per post, in priority order within each pillar:

```json
{ "id": "pillar-slug-topic", "pillar": "pillar-slug", "type": "cluster", "stage": "buyer",
  "question": "The one question this post answers",
  "primaryKeyword": "exact keyword", "angle": "What makes this post different",
  "monthlySearches": 2400, "status": "planned" }
```
- Start with the pillar guides, then buyer-stage clusters, then the rest.
- Keep at least two weeks of `planned` topics (`plan.mjs` warns when the runway is short). Grow it from "people also ask", Search Console queries and competitor gaps.
- After publishing, set `status: published` and add `slug` and `publishedAt` with a targeted edit.

## One intent per URL (cannibalization)
Two posts that answer the same question compete with each other. Before adding a topic, check every existing `primaryKeyword` and `question`. The QA gate blocks duplicates and near-duplicates. If two topics overlap, merge them or change the angle until the questions differ.

## Validate and adjust
After 4 to 8 weeks, look at Search Console: which posts get impressions but few clicks (rewrite title and description), which sit at positions 8 to 30 (strengthen and link to them), which topics earn nothing (stop that cluster). Update the backlog order accordingly.
