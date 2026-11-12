# 04. The SEO + AEO + GEO playbook

Three goals, one page: **SEO** (rank in classic search results), **AEO** (be the answer in featured snippets, "people also ask" and voice answers) and **GEO** (be quoted or cited by AI assistants that summarise the web). Techniques overlap. Each item below says what to do and how to verify it.

> Honest scope: nobody outside the search companies can promise rankings or citations. SEO fundamentals are well documented; AEO is established practice; GEO is young and mostly based on how these systems are built, so treat its items as hypotheses and test them on your own pages.

## SEO fundamentals

| Do | Verify |
|---|---|
| One search intent per URL; primary keyword in the title, H1, first 150 words, one H2 and the slug | `qa.mjs` (keyword checks, duplicate checks) |
| Title that is descriptive and not shocking (Google's guidance: avoid exaggeration); under about 60 characters because titles truncate by width | `qa.mjs` title length |
| Meta description of roughly 120 to 160 characters that states the payoff (search engines may rewrite it; it is a convention, not a ranking factor) | `qa.mjs` |
| Keyword-led slug under 60 characters | `qa.mjs` |
| Internal links: pillar guide, a sibling post and a conversion page, with descriptive anchor text (never "click here") | `qa.mjs` link checks |
| Authorship that is self-evident: a real byline, a reviewer where readers expect one, a profile page | `qa.mjs` author checks, `schema.mjs` |
| Honest dates: change `updatedAt` only when the content changed substantially (Google's guidance warns against faking freshness) | manual |
| Original value: say what this page adds that the first page of results does not (`originality` field) | `qa.mjs` |
| Fast, mobile-friendly, crawlable pages; an XML sitemap; no accidental `noindex` | site audit (outside this skill) |
| Avoid keyword stuffing and scaled thin pages: both are named in Google's spam policies | `qa.mjs` year-mention cap; judgement |

## AEO: be the answer
- **Answer first.** The first paragraph answers the question in 40 to 80 words and stands alone.
- **Question-shaped H2s** with a 40 to 60 word direct answer before the detail. Verify: the QA bar counts them.
- **Definitions:** a one-sentence "X is ..." for the main entity inside the first 100 words.
- **Extractable structures:** a comparison table for "X vs Y", a numbered list for how-tos, bullets for criteria. Verify: tables and numbered H2s counted by the gate.
- **FAQ section** with 3 to 5 real questions (from search suggestions and Search Console), each answer 40 to 90 words and self-contained (name the entity; do not say "it").
- **Structured data:** `BlogPosting`, `BreadcrumbList` and, for numbered posts, `ItemList` help machines understand the page. `FAQPage` markup is valid, but Google's documentation says FAQ rich results are no longer shown in Google Search, so write FAQs for readers and answer engines and do not expect a snippet. Generate markup with `schema.mjs`. Structured data never guarantees a rich result.

## GEO: be quotable and citable
- **Quotable, attributed facts.** "According to <Publisher> (<Month YYYY>), ..." with a link, one per major section. Assistants and readers both prefer claims they can trace.
- **An original data point** per post, clearly labelled as yours (your own test, count, survey, price check), written as a standalone sentence.
- **Entity consistency.** Use the same names for the brand, products and people everywhere; avoid pronoun-only references in key sentences.
- **Self-contained paragraphs** of two to four sentences, each making one point, so a passage lifted out of context still makes sense.
- **Balance.** Include a limitations paragraph ("what this approach does not do") and a "when to choose X vs Y" sentence per option. Balanced pages read as trustworthy and are easier to cite.
- **Freshness stamps.** "Facts checked <Month YYYY>" near the end; dated facts in the text.
- **Access.** Do not block the crawlers you want in `robots.txt`; decide deliberately which AI crawlers to allow. Check that important pages are reachable without logging in or running scripts.
- **Optional, unproven extras:** an `llms.txt` file and clean Markdown copies of posts (`llms-txt.mjs`). No search engine has promised to use them; they cost almost nothing.

## Trust (E-E-A-T)
Google describes experience, expertise, authoritativeness and trustworthiness as ways to identify helpful content, says E-E-A-T itself is not a specific ranking factor, and that trust matters most. Practical meaning: real authors, first-hand material, sources you can click, an About page, contact details, and no fake testimonials.

## Per-post checklist (copy into the brief)
- [ ] Single intent and primary keyword, not used by another post
- [ ] Answer in the first 80 words; main entity defined
- [ ] 3 or more question-shaped H2s with direct answers
- [ ] A table or other visual; numbered H2s if the headline has a number
- [ ] 3 or more sources opened and linked; every statistic sourced or labelled as yours
- [ ] One original element; one quotable attributed statistic per major section
- [ ] Limitations paragraph; "when to choose" sentences
- [ ] Internal links: pillar guide, sibling, conversion page
- [ ] Byline and reviewer; honest dates; "Facts checked <Month YYYY>"
- [ ] `qa.mjs` passes with no errors
