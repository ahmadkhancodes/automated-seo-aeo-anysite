# 01. The intake interview

Goal: learn enough to write a strategy that fits this owner, in about ten minutes of their time. Ask in small groups (at most four questions at a time), offer a default for each, and accept "not sure" as an answer. Write the answers into `seo.config.json` and `strategy/STRATEGY.md` as you go.

## Group A: the business
1. What does the site sell or offer, in one sentence? Who pays you?
2. Who is the ideal reader or buyer (role, company size or life situation, country)?
3. What is the one action you most want a reader to take (book a call, request a quote, sign up, buy, subscribe)? Where does that action happen (URL)?
4. Which markets and languages? (Default: one country, one language. Non-English sites turn the English humanizer lint off in the config.)

## Group B: the site and publishing
5. What is the site built with (WordPress, Webflow, Shopify, Next.js, static files, something else)? Can posts be published as Markdown files, through an API, or only by copy and paste?
6. Is there already a blog? Roughly how many posts, and which ones bring traffic? Is Google Search Console connected? (If yes, ask for a Performance export of top queries and top pages.)
7. Who owns the domain's analytics and tracking? (You only need to know whether numbers will be available later.)
8. Where should finished posts go: a git repository, a folder, a CMS draft queue, or this chat?

## Group C: competition and keywords
9. Name 3 to 5 competitors or sites you admire in this space.
10. Do you have keyword data? Any of: Google Keyword Planner export, Google Trends export, Search Console export, a spreadsheet from another tool. (If not, say that you will research with the search tool and mark volumes as unverified. See `02-keyword-strategy.md`.)
11. Which topics are off limits, or which claims can never be made (legal, medical, financial, competitor names)?
12. Is the topic "Your Money or Your Life" (health, money, legal, safety)? If yes, a qualified human reviewer is mandatory (see `08-evidence-and-honesty.md`).

## Group D: voice, trust and conversion
13. Who are the real authors and reviewers (name, role, a profile page URL)? Never invent one. If there is none yet, publish under the organisation and plan to add real bylines.
14. Describe the voice in three words, and give one sentence the brand would never say.
15. What do you offer after a reader is convinced (service, product, consultation, trial)? What proof can you show (real case studies, data, certifications)? Only use what the owner provides.
16. What pages should posts link to as conversion pages (service pages, product pages, contact)? These go into `conversion.requireInternalPrefix`.

## Group E: cadence, budget and style
17. How many posts per day or week? (Default: 1 a day while the strategy is new. 3 a day only if every post will still be reviewed.)
18. Is there a monthly usage or cost limit for the AI tools? (This decides batch size and model tiers; see `09-running-it.md`.)
19. Do you want a future-year edition, where titles and text target the coming year ("Top 5 ... in 2027")? Default: yes if the topic is tools, trends or buying decisions; no for evergreen how-tos.
20. Who approves posts before they go live, and how fast do they reply?

## After the interview
- Run `init.mjs`, then complete `seo.config.json`: `site`, `authors`, `pillars` (placeholder until Stage 3), `program.postsPerDay`, `yearEdition`, `conversion.requireInternalPrefix`.
- Write `strategy/STRATEGY.md`: audience, goal, offer, voice (with the never-say sentence), conversion path, constraints, off-limit topics.
- Summarise back to the owner in five lines and ask them to correct anything wrong before moving on.
