# Sample session (fictional)

A short walkthrough of what a first conversation looks like. "Acme Gardens" is an invented business, and every number below is made up for illustration.

---

**You:** Digest this skill and set up my SEO engine.

**Claude:** Done. In short, I can: interview you about your site; read your keyword exports (Keyword Planner, Trends, Search Console); build pillars and a topic backlog; then research, write, fact-check and quality-check posts in daily batches, each one better than the last. I will need about ten minutes for questions and, if you have them, your keyword exports. I will not publish anything without your yes. I can run scripts here, so the quality gate will run automatically.
First questions:
1. What does the site sell, in one sentence, and who pays you?
2. Who is your ideal customer (role, location)?
3. What one action do you most want a reader to take, and on which page?
4. Which country and language are you targeting?

**You:** We sell raised garden beds in the UK to homeowners. I want people to request a quote on /quote. English, UK.

**Claude:** Thanks. Next group: how do you publish (WordPress, Shopify, static files?), is there an existing blog, and do you have Search Console connected? And please name 3 to 5 competitors you admire.

*(…the interview continues for a few more groups…)*

**Claude:** Here is what I understood: [five-line summary]. Please correct anything wrong. Then I need keyword data. In Google Ads → Tools → Keyword Planner, enter "raised garden beds" and two or three related terms, choose United Kingdom, and download the keyword ideas CSV. From Search Console, export your top queries. Drop the files here.

**You:** *(uploads planner.csv and queries.csv)*

**Claude:** *(runs `keywords.mjs`)* 312 keywords after filters. Four clusters stand out: raised beds (buyer-heavy), vegetable growing in raised beds (how-to), soil and fillers, and small-garden layouts. Three queries sit at positions 8 to 30 on pages you already have: I would refresh those first.

**Your 30-day path**
- Pillars: raised garden beds (buyer guide), what to grow, soil and fillers.
- First 10 posts: [list with headline shapes, for example "Top 5 Raised Bed Materials for UK Gardens in 2027"].
- Cadence: one post a day for two weeks, then review Search Console before raising it.
- Needs from you: a real name and photo for the author, three real customer questions, your price range if you want cost posts.
- Look at after 2, 4, 8 weeks: impressions, clicks and positions for the new posts; the three refreshed pages.

Shall I write the first batch for your review?

---

From there, each day: `plan.mjs` says what is due, evidence packs are filled with verbatim quotes, the posts are written in order and checked by `qa.mjs`, and one lesson per post is added to `strategy/LEARNINGS.md`.
