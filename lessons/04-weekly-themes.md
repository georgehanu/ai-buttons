---
title: This week's themes
lesson: 4
code: src/features/themes.ts
run: npm run lesson4
---

# Lesson 4 · This week's themes

The shop owner doesn't want to read 24 tickets on a Friday. They want: *what keeps going wrong, and what should I fix?*

One button, three steps:

```text
24 tickets ──► label each one (fast model, 6 at a time)
           ──► group the labels into themes (smart model, one call)
           ──► count, sort, check (plain code)
```

## Step 1: fan out

Each ticket is independent, so we label them in parallel:

```ts
const labels = await inBatches(WEEK, 6, (ticket) =>
  askJson<Label>({ step: `label #${ticket.id}`, model: "fast", schema: LABEL_SCHEMA, /* … */ }),
);
```

`inBatches` is ten lines of plain TypeScript: at most 6 requests in flight at once. All 24 at once would hit rate limits. One at a time would take 24× longer.

Each label is tiny:

```json
{ "label": "arrived cracked again", "product": "Mug", "mood": "upset" }
```

## Step 2: combine

The smart model never sees the 24 full tickets. It gets 24 short lines:

```text
1. arrived chipped (Mug, upset)
2. order not arrived (no product, upset)
3. fits smaller than expected (Hoodie, neutral)
…
```

That's a fraction of the tokens, and a clearer job: *group these into 4 to 7 themes a small shop owner can act on.* The labelling did the reading. The grouping does the thinking.

## Step 3: let code count

The model returns theme names and ticket ids. **It doesn't return counts.** We count:

```ts
const seen = new Set<number>();
const cleaned = themes.map((theme) => ({
  ...theme,
  ticket_ids: theme.ticket_ids.filter((id) => WEEK.some((t) => t.id === id) && !seen.has(id) && seen.add(id)),
}));
const missing = WEEK.map((t) => t.id).filter((id) => !seen.has(id));
if (missing.length) cleaned.push({ name: "Not grouped", suggestion: "Read these yourself.", ticket_ids: missing });
```

That handles all three ways this goes wrong: ids that don't exist, a ticket put in two themes, and tickets that got dropped. Then we sort by count, in code.

Language models are bad at counting and great at grouping. Give each job to whatever's good at it.

## The result

```text
 6 ██████ Slow or stuck deliveries
     Email tracking at dispatch and chase the courier for orders older than 4 days.
 5 █████ Mugs arrive broken
     Drop-test the mug packaging and add corner protection or a double box.
 4 ████ Clothes run small
     Add a size guide with real measurements to the hoodie and T-shirt pages.
 …
```

Five broken mugs in a week isn't five unlucky customers. It's a packaging problem. You only see that when the tickets are grouped together.

## Two models, on purpose

| Step | Model | Calls | Why |
| --- | --- | --- | --- |
| Label | fast | 24 | Simple, repetitive, many calls |
| Group | smart | 1 | Judgment, one call, short input |

Most of the calls go to the cheap model, and the one call that needs judgment goes to the strong one.

## Run it

```bash
npm run lesson4
npm start   # then the "This week" tab
```

## Try this

- Double the tickets to 48. What happens to the cost of step 2? (Barely anything. It only sees labels.)
- Ask the grouping step for counts too, then compare them with your code's counts on a few live runs.
