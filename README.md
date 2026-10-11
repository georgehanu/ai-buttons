# AI Buttons

**Small AI features that feel like normal buttons. Six short lessons, one real web app, TypeScript.**

By George Hanu · [@georgehanu](https://x.com/georgehanu) · [Read it as a website](https://georgehanu.github.io/ai-buttons/)

Most AI features in real apps aren't agents. They're buttons: *tidy this up*, *fill this in*, *what's this about?*, *draft a reply*. This repo builds five of them into a small support desk, each as a **workflow**: your code fixes the steps, the model does one clear job per step, and a person stays in charge.

```text
npm run lesson5

email   my order TS-48213 arrived today and the big mug is cracked…

── first draft ──
writer  We'll send you a new one today, and we'll also refund the mug within 24 hours…
✗ R1 "refund the mug within 24 hours" → Offer a replacement or a refund, not both.
✗ R2 "We'll send you a new one today" → Don't promise a dispatch day.
✗ R3 → Ask for a photo of the crack.
── one targeted revision ──
writer  Could you send us a photo of the crack? As soon as we have it, we'll send you a new mug…
✓ checker: no problems

Ready for a person to read, edit and send. Nothing has been sent.
```

## The lessons

| # | Button | Pattern | Run |
| --- | --- | --- | --- |
| 1 | [Tidy up](lessons/01-tidy-up.md) | One call, structured edits, the person picks | `npm run lesson1` |
| 2 | [Fill from email](lessons/02-fill-from-email.md) | Extraction, enums, "unknown" as an answer | `npm run lesson2` |
| 3 | [Route it](lessons/03-route-it.md) | Cheap classifier, then a specialist | `npm run lesson3` |
| 4 | [This week's themes](lessons/04-weekly-themes.md) | Fan out, combine, let code count | `npm run lesson4` |
| 5 | [Draft and check](lessons/05-draft-and-check.md) | Writer + rule checker + one revision + human | `npm run lesson5` |
| 6 | [Ship it](lessons/06-ship-it.md) | Prompt injection, fallbacks, cost, evals | `npm run lesson6` |
| + | [Design your own AI button](lessons/07-your-own-button.md) | Five questions for any AI feature | |

## Quick start

You need Node.js 20 or newer.

```bash
git clone https://github.com/georgehanu/ai-buttons.git
cd ai-buttons
npm install
npm start
```

Open http://localhost:3000. Pick an email, press the ✦ buttons, open the **This week** tab.

**No API key needed to start.** Without a key, the app and the lessons run in *replay mode*, with pre-written answers for the sample emails. Everything else is real: the schemas, the checks, the routing, the revision step, the cost lines.

**To run against Claude**, copy `.env.example` to `.env` and add your key from the [Claude Console](https://platform.claude.com/):

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Two models are used on purpose: `claude-opus-5-5` where quality matters, `claude-haiku-5-5` for small, frequent steps. Change them with `SMART_MODEL` and `FAST_MODEL` in `.env`.

## What's inside

```text
lessons/          the six lessons and the epilogue (start here)
src/features/     one file per button: tidy, fill, route, themes, reply
src/model.ts      ask() and askJson(): live Claude calls, replay mode, cost per call
src/server.ts     the app's server (plain node:http)
public/           the support desk UI (plain HTML, CSS and JS)
src/lessons/      one runnable terminal demo per lesson
evals/run.ts      a tiny eval suite: npm run eval
```

## Who it's for

Web developers who want to add AI to an existing app without turning it into a science project. You should be comfortable with JavaScript or TypeScript. No AI background needed.

Want to go one level deeper, to agents that pick their own steps? See the companion repo, [The Agent Loop](https://github.com/georgehanu/the-agent-loop).

## License

MIT. Use the code in your own projects, workshops or teaching. A link back is appreciated.
