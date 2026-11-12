# 05. Numbered headlines and the future-year edition

## Why numbers
Numbered titles set a clear expectation ("5 things"), are easy to scan in results, and give the post a built-in structure: one H2 per item. The rule that keeps them honest: **the number in the title must equal the number of items in the post.** The QA gate checks that "Top 5" has exactly five numbered H2s (`## 1. Name` to `## 5. Name`), and `schema.mjs` turns them into `ItemList` markup.

## Formulas (rotate them; `plan.mjs` suggests the least-used one)
| Shape | Pattern | Best for |
|---|---|---|
| Top N | "Top 5 [Tools/Options] for [Audience] in [Year]" | buyer-stage comparisons |
| N Ways | "7 Ways to [Get Result] in [Year]" | how-to with several routes |
| N Mistakes | "5 Mistakes to Avoid When [Doing Thing] in [Year]" | problem-aware readers |
| N-Step Plan | "A 4-Step Plan to [Reach Goal] in [Year]" | process, onboarding, migrations |
| N Signs / Questions | "6 Signs You Need [Solution] in [Year]" / "9 Questions to Ask Before [Decision]" | consideration stage |
| N Tools / Use cases / Templates | "9 [Use Cases] Worth Trying in [Year]" | idea lists, examples |

Keep the SEO `title` under about 60 characters (it can be shorter than the H1) and keep the primary keyword in the H1. Examples across niches: "Top 5 CRM Tools for Plumbers in 2027", "7 Ways to Cut Cart Abandonment in 2027", "A 4-Step Plan to Move Your Store to a New Platform in 2027".

## The future-year edition
Turn it on with `yearEdition.enabled: true` and `year: 2027` in `seo.config.json`. From the start date, the gate requires the year in the SEO title, the H1, the description, the opening paragraph and at least one H2 (for example "What changes in 2027?"), plus 3 to 14 natural mentions in the body.

Why: people search for "best X 2027", and a post written for the coming year reads as current. How to do it honestly:
- Write from the reader's decision in that year: what to plan, budget and pilot, and what is changing.
- Every forward-looking claim is either linked to a source you opened and dated (an analyst forecast, a regulator's timeline, a vendor's published roadmap) or labelled "our view" and written as reasoning. No invented forecasts, market sizes or percentages.
- Facts about products and prices stay "as of <Month YYYY>". A "best tools in 2027" post says plainly that the facts were checked in <Month YYYY> and what to re-check before buying.
- Never describe the future year as if it had already happened.
- Do not repeat the year in every sentence; that is keyword stuffing, and the gate warns above the cap.
- When the year turns, decide post by post: refresh the facts and update the title, or leave the post as a dated record. Do not just swap the number.

If the site's topics are evergreen, leave the edition off and use numbered headlines without a year.
