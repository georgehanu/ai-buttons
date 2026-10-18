// Builds the GitHub Pages site in docs/ from lessons/*.md.
// Usage: npm run site

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

const REPO = "https://github.com/georgehanu/ai-buttons";
const X = "https://x.com/georgehanu";
const SITE = "https://georgehanu.github.io/ai-buttons/";
// The share image is built by the hub (georgehanu.github.io, scripts/og.mjs) from its guide
// data, so every guide's link preview uses the same template. The index and every lesson use it.
const OG_IMAGE = "https://georgehanu.github.io/og/guides/ai-buttons.png";
const OG_IMAGE_ALT =
  "AI Buttons: Small AI features for real apps, built as workflows with a human in the loop. Coding with AI, by George Hanu.";
const root = new URL("../", import.meta.url);
const out = new URL("docs/", root);
mkdirSync(out, { recursive: true });

const marked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
);

const lessons = readdirSync(new URL("lessons/", root))
  .filter((file) => file.endsWith(".md"))
  .sort()
  .map((file) => {
    const raw = readFileSync(new URL(`lessons/${file}`, root), "utf8").replace(/\r\n/g, "\n");
    const [, front, body] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    const meta = Object.fromEntries(
      front.split("\n").map((line) => {
        const [key, ...rest] = line.split(":");
        return [key.trim(), rest.join(":").trim().replace(/^"|"$/g, "")];
      }),
    );
    return { file, slug: file.replace(/\.md$/, ""), ...meta, body };
  });

const summaries = {
  1: "Suggest edits, let people pick, apply with plain code.",
  2: "Messy email in, form fields out. Unknown stays unknown.",
  3: "A cheap model sorts, code routes, a specialist answers.",
  4: "Fan out over 24 tickets, combine, let code count.",
  5: "Writer, rule checker, one targeted fix, then a person.",
  6: "Prompt injection, failures, cost per click, evals.",
  7: "Five questions for designing your own AI button.",
};

const EPILOGUE = "7";
const label = (lesson) => (lesson.lesson === EPILOGUE ? "Epilogue" : `Lesson ${lesson.lesson}`);
const num = (lesson) => (lesson.lesson === EPILOGUE ? "+" : lesson.lesson);

function rewriteLinks(html) {
  return html
    .replace(/href="(\d\d-[a-z-]+)\.md"/g, 'href="$1.html"')
    .replace(/href="\.\.\/(src|evals|public)\/([^"]*)"/g, `href="${REPO}/blob/main/$1/$2"`);
}

const attr = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function page({ title, description, body, current }) {
  const url = current === "index" ? SITE : `${SITE}${current}.html`;
  const social = `<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${attr(OG_IMAGE_ALT)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@georgehanu">
<meta name="twitter:title" content="${attr(title)}">
<meta name="twitter:description" content="${attr(description)}">
<meta name="twitter:image" content="${OG_IMAGE}">
<meta name="twitter:image:alt" content="${attr(OG_IMAGE_ALT)}">`;
  const nav = lessons
    .map((l) => `<a href="${l.slug}.html"${l.slug === current ? ' aria-current="page"' : ""}><span>${num(l)}</span>${l.title}</a>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
${social}
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✦</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
<script data-goatcounter="https://georgehanu.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</head>
<body>
<header class="top">
  <a class="brand" href="index.html"><span class="loop">✦</span> AI Buttons</a>
  <nav class="top-links">
    <a href="${REPO}">GitHub</a>
    <a class="follow" href="${X}">Follow @georgehanu</a>
  </nav>
</header>
${current === "index" ? body : `<div class="layout">
  <aside class="side"><div class="side-title">Lessons</div>${nav}</aside>
  <main class="lesson">${body}</main>
</div>`}
<footer class="foot">
  <p>Written by <a href="${X}">George Hanu</a>. I teach developers to build software with AI: small examples, explained clearly.</p>
  <p><a href="${X}">Follow on X</a> · <a href="${REPO}">Source on GitHub</a> · MIT licensed</p>
</footer>
</body>
</html>
`;
}

lessons.forEach((lesson, i) => {
  const prev = lessons[i - 1];
  const next = lessons[i + 1];
  const meta =
    lesson.run || lesson.code
      ? `<div class="meta">${lesson.run ? `<span>Run</span><code>${lesson.run}</code>` : ""}${
          lesson.code ? `<a href="${REPO}/blob/main/${lesson.code}">View the code →</a>` : ""
        }</div>`
      : "";
  const pager = `<nav class="pager">${
    prev ? `<a href="${prev.slug}.html"><small>← ${label(prev)}</small>${prev.title}</a>` : "<span></span>"
  }${next ? `<a class="next" href="${next.slug}.html"><small>${label(next)} →</small>${next.title}</a>` : ""}</nav>`;
  const cta = `<aside class="cta"><strong>Found this useful?</strong> I post small, practical AI coding examples most days.
  <a href="${X}">Follow @georgehanu on X</a></aside>`;

  writeFileSync(
    new URL(`${lesson.slug}.html`, out),
    page({
      title: `${label(lesson)}: ${lesson.title} · AI Buttons`,
      description: `${lesson.title}. Part of AI Buttons: small AI features for real web apps, built as workflows.`,
      body: `${meta}${rewriteLinks(marked.parse(lesson.body))}${cta}${pager}`,
      current: lesson.slug,
    }),
  );
});

const cards = lessons
  .map((l) => `<a class="card" href="${l.slug}.html">
      <span class="num">${num(l)}</span>
      <span class="card-title">${l.title}</span>
      <span class="card-sub">${summaries[l.lesson] ?? ""}</span>
    </a>`)
  .join("\n");

const home = `
<main class="home">
  <section class="hero">
    <p class="eyebrow">Free · 6 lessons · TypeScript · A real web app</p>
    <h1>AI features that feel like<br><em>normal buttons.</em></h1>
    <p class="lead">Tidy up a reply. Fill a form from an email. Route a ticket. Spot this week's themes. Draft a reply that
      passes your written rules. Five small AI features in a working support desk, each built as a workflow you can read, test and trust.</p>
    <div class="actions">
      <a class="btn primary" href="${lessons[0].slug}.html">Start lesson 1</a>
      <a class="btn" href="${REPO}">Get the code</a>
    </div>
  </section>

  <section class="terminal" aria-label="Example run">
    <div class="bar"><i></i><i></i><i></i><span>npm run lesson5</span></div>
<pre><span class="t-you">email</span>  my order TS-48213 arrived today and the big mug is cracked…

<span class="t-dim">── first draft ─────────────────────────────</span>
<span class="t-mag">writer</span> We'll send you a new one today, and we'll also refund the
       mug within 24 hours so you're not out of pocket.
<span class="t-red">✗ R1</span> <span class="t-dim">"refund the mug within 24 hours" → replacement or refund, not both</span>
<span class="t-red">✗ R2</span> <span class="t-dim">"We'll send you a new one today" → don't promise a dispatch day</span>
<span class="t-red">✗ R3</span> <span class="t-dim">no photo requested → ask for a photo of the crack</span>
<span class="t-dim">── one targeted revision ─────────────────────────────</span>
<span class="t-mag">writer</span> Could you send us a photo of the crack? As soon as we have it,
       we'll send you a new mug free of charge…
<span class="t-green">✓ checker: no problems</span>

<span class="t-yel">Ready for a person to read, edit and send. Nothing has been sent.</span></pre>
  </section>

  <section class="points">
    <div><h3>A real app, not snippets</h3><p>A small support desk with an inbox, a reply box and a weekly report. Run it with <code>npm start</code> and click the buttons.</p></div>
    <div><h3>No API key to start</h3><p>Replay mode uses pre-written answers for the sample emails. Add a key to run every button live against Claude.</p></div>
    <div><h3>Built to be trusted</h3><p>Schemas, checks in plain code, "unknown" as an answer, a person in charge, fallbacks, and a small eval suite.</p></div>
  </section>

  <section>
    <h2>The lessons</h2>
    <div class="cards">${cards}</div>
  </section>

  <section class="start">
    <h2>Run it in a minute</h2>
<pre><code>git clone ${REPO}.git
cd ai-buttons
npm install
npm start</code></pre>
    <p>Node.js 20 or newer. Then open <code>http://localhost:3000</code>.</p>
  </section>

  <section class="author">
    <div>
      <h2>Hi, I'm George.</h2>
      <p>I'm a senior web developer. I teach developers to build software with AI, from useful scripts to app features.
        Small examples, explained clearly. This is the companion to <a href="https://georgehanu.github.io/the-agent-loop/">The Agent Loop</a>.
        If it helped, the best thanks is a follow, and tell me which button you built.</p>
      <a class="btn primary" href="${X}">Follow @georgehanu on X</a>
    </div>
  </section>
</main>`;

writeFileSync(
  new URL("index.html", out),
  page({
    title: "AI Buttons · Small AI features for real web apps",
    description:
      "Six short lessons: build small AI features into a real web app as workflows. TypeScript, runs without an API key. By George Hanu.",
    body: home,
    current: "index",
  }),
);

writeFileSync(new URL(".nojekyll", out), "");
writeFileSync(new URL("style.css", out), readFileSync(new URL("scripts/site.css", root), "utf8"));
console.log(`Built ${lessons.length + 1} pages in docs/`);
