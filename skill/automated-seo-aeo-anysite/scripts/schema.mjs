#!/usr/bin/env node
// Generate schema.org JSON-LD for a post: BlogPosting, BreadcrumbList, ItemList (numbered posts) and
// FAQPage. Paste the output into your CMS or template.
//
//   node scripts/schema.mjs <slug|file> [--format json|html] [--no-faq]
//
// Note on FAQ markup: Google's documentation says FAQ rich results no longer appear in Google Search,
// so FAQPage will not earn a rich result there. It stays valid, machine-readable question/answer data
// that some other consumers read, and it costs nothing. Use --no-faq to leave it out.

import { loadConfig, readPosts } from "./lib.mjs";

const cfg = loadConfig();
const args = process.argv.slice(2).filter((a, i, arr) => a !== "--config" && arr[i - 1] !== "--config" && a !== "--format" && arr[i - 1] !== "--format");
const fi = process.argv.indexOf("--format");
const format = fi >= 0 ? process.argv[fi + 1] : "json";
const noFaq = process.argv.includes("--no-faq");
const target = args.find((a) => !a.startsWith("--"));
if (!target) { console.error("Usage: node scripts/schema.mjs <slug|file> [--format json|html] [--no-faq]"); process.exit(2); }

const post = readPosts(cfg).find((p) => p.slug === target || p.file.endsWith(target));
if (!post?.fm) { console.error(`Post not found or unreadable: ${target}`); process.exit(2); }
const { fm, body } = post;

const base = cfg.site.url.replace(/\/$/, "");
const prefix = cfg.paths.blogUrlPrefix;
const url = `${base}${prefix}${post.slug}`;
const person = (slug) => {
  const a = cfg.authors[slug];
  if (!a) return { "@type": "Organization", name: cfg.site.name, url: base };
  return a.type === "Organization"
    ? { "@type": "Organization", name: a.name, url: a.url ? (a.url.startsWith("http") ? a.url : base + a.url) : base }
    : { "@type": "Person", name: a.name, ...(a.role ? { jobTitle: a.role } : {}), ...(a.url ? { url: a.url.startsWith("http") ? a.url : base + a.url } : {}), ...(a.sameAs?.length ? { sameAs: a.sameAs } : {}) };
};
const pillar = cfg.pillars.find((p) => p.slug === fm.pillar);
const prose = body.replace(/```[\s\S]*?```/g, " ");
const words = prose.split(/\s+/).filter(Boolean).length;
const d = (v) => String(v ?? "").slice(0, 10);

const graph = [];
graph.push({
  "@type": "BlogPosting", "@id": `${url}#article`, headline: fm.h1, name: fm.title, description: fm.description,
  datePublished: d(fm.publishedAt), dateModified: d(fm.updatedAt ?? fm.publishedAt),
  author: person(fm.author), ...(fm.reviewer ? { reviewedBy: person(fm.reviewer) } : {}),
  publisher: { "@type": "Organization", name: cfg.site.name, url: base },
  mainEntityOfPage: { "@type": "WebPage", "@id": url },
  keywords: [fm.primaryKeyword, ...(fm.secondaryKeywords ?? [])].filter(Boolean).join(", "),
  ...(pillar ? { articleSection: pillar.name } : {}), wordCount: words, inLanguage: cfg.site.language ?? "en",
  ...(fm.image ? { image: fm.image.startsWith("http") ? fm.image : base + fm.image } : {}),
  citation: (fm.sources ?? []).map((s) => ({ "@type": "CreativeWork", name: s.title, url: s.url, ...(s.publisher ? { publisher: { "@type": "Organization", name: s.publisher } } : {}) })),
});
graph.push({
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: base + "/" },
    { "@type": "ListItem", position: 2, name: "Blog", item: base + prefix.replace(/\/$/, "") },
    ...(pillar ? [{ "@type": "ListItem", position: 3, name: pillar.name, item: `${base}${prefix}topics/${pillar.slug}` }] : []),
    { "@type": "ListItem", position: pillar ? 4 : 3, name: fm.h1, item: url },
  ],
});
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const items = [...body.matchAll(/^## +(\d{1,2})\.\s+(.+)$/gm)];
if (items.length >= 3) graph.push({
  "@type": "ItemList", "@id": `${url}#list`, name: fm.h1, itemListOrder: "https://schema.org/ItemListOrderAscending", numberOfItems: items.length,
  itemListElement: items.map((m, i) => ({ "@type": "ListItem", position: i + 1, name: m[2].replace(/[*_`]/g, "").trim(), url: `${url}#${slugify(m[2].replace(/[*_`]/g, ""))}` })),
});
if (!noFaq && Array.isArray(fm.faqs) && fm.faqs.length) graph.push({
  "@type": "FAQPage", mainEntity: fm.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

const doc = { "@context": "https://schema.org", "@graph": graph };
if (format === "html") console.log(`<script type="application/ld+json">\n${JSON.stringify(doc, null, 2)}\n</script>`);
else console.log(JSON.stringify(doc, null, 2));
