# 03. The post pipeline

## Roles (use cheaper models for gathering, stronger ones for writing)
- **Orchestrator:** runs `plan.mjs`, keeps its own context small, starts the helpers, relays short reports.
- **Researchers (a fast, low-cost model, one per topic, in parallel):** search the exact question, open every candidate source, and fill an evidence pack (`templates/evidence-pack.md`) with VERBATIM quotes and exact figures. Nothing goes in the pack that was not copied from a page the researcher opened.
- **Writer (a strong model, one run for the whole batch):** reads the pack files, the playbook and the memory file once, then writes the posts in order inside one context, so the shared setup is cached and each post can improve on the last.

If you are one model in one chat, do the same steps yourself in the same order.

## Steps for each post
1. **Pick the topic** from the batch plan. One pillar per post where possible; a pillar guide goes first.
2. **Research:** search the exact question; read the top results and any AI answers; note what they miss. Collect 3 to 6 authoritative sources (official docs, standards bodies, regulators, primary research, the product owner's own page). Open each one and confirm it supports the claim.
3. **Brief** (`templates/brief.md`): single search intent, reader, the angle the results miss, the original element, the H2 outline, the visual plan, the internal links, the conversion path.
4. **Write** (`templates/post.md`): answer in the first 40 to 80 words; question-shaped H2s with a 40 to 60 word direct answer first; a table or visual; the numbered-item structure if the headline has a number; FAQs written for readers; a next-step section and a closing recommendation (`06-conversion-writing.md`).
5. **Humanize:** short and long sentences mixed, plain words, specific nouns, no filler openers or stock phrases, no more than a few em dashes. Read it aloud once.
6. **Fact-check:** every number, quote, name and date against the evidence pack; a claim with no quote in the pack goes. Re-open a source only when a claim is in doubt. Dated facts say "as of <Month YYYY>".
7. **QA:** `node scripts/qa.mjs <slug>`. Fix every error. Aim for zero warnings and a score of 90+.
8. **Publish** by the owner's method (commit and push, CMS draft, or hand over the Markdown). Update the backlog entry, add `schema.mjs` output if the site needs JSON-LD pasted in, and regenerate `llms-txt.mjs` output if the site serves it.
9. **Learn:** append one line per post to `strategy/LEARNINGS.md` (what the gate or fact-check caught, what to do better).

## Batches
- Write the day's posts back to back. Post 2 must be better than post 1, post 3 better than post 2: match or beat the quality bar from `plan.mjs` and use one improvement from the memory file's menu that the previous post did not.
- Run QA on all of them, build or validate the site once, publish once.
- If a post cannot reach the bar (a source will not load, a claim cannot be backed), swap the topic or publish fewer, and say why. Never lower the bar to hit a number.

## Existing posts
Do not rewrite old posts to match a new edition. Refresh the ones in Search Console's striking-distance list, update facts and sources, then update the date and say what changed.
