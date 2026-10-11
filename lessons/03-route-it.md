---
title: Route it
lesson: 3
code: src/features/route.ts
run: npm run lesson3
---

# Lesson 3 · Route it

One prompt that handles every kind of support email gets long, vague and expensive. "If it's about shipping do this, if it's billing do that, unless…" Every email pays for every rule.

Better: **sort first, then hand it to a specialist.**

```text
email ──► classify (fast model) ──► code picks the specialist ──► next steps (smart model)
                     │
                     └── not sure? ──► a person
```

## Step 1: a cheap sort

```ts
const classification = await askJson<Classification>({
  step: "classify",
  model: "fast",
  schema: {
    category: { enum: ["shipping", "damaged", "billing", "returns", "other"] },
    confident: { type: "boolean", description: "false if the email fits two categories or none." },
    reason: { type: "string" },
  },
  // …
});
```

Classification is a small job. The fast model handles it quickly, at a small fraction of the smart model's price.

## Step 2: code decides where it goes

```ts
if (!classification.confident || classification.category === "other") {
  return { classification, routedTo: "person", next: null };
}
const specialist = SPECIALISTS[classification.category];
```

This is the line that makes it a **workflow**. The model gave an opinion. Your code turned it into a path. Paths are something you can see in the code, test and change.

Notice the `confident` flag. When the classifier isn't sure, we **don't guess**: a person gets the ticket, with no AI suggestions to anchor them. Wrong routing is worse than no routing, because the specialist will confidently follow the wrong policy.

## Step 3: a specialist with only what it needs

Each specialist gets:

- **one focus**, e.g. damaged: *"Get a photo first. Offer replacement or refund. The customer keeps the damaged item."*
- **one section of the policy**, not the whole document.

```ts
damaged: { policy: "Damaged items", focus: "Get a photo first. Offer replacement or refund. …" },
billing: { policy: "Billing", focus: "Check whether it's a pending authorisation before refunding anything. …" },
```

Shorter prompts mean fewer tokens, but the bigger win is quality. A model that only sees the billing rules can't mix them up with the returns rules.

The specialist uses the **smart** model, because its answer is what a person acts on.

## Run it

```bash
npm run lesson3
```

```text
broken mug :(
  damaged  Mug arrived cracked; customer wants a replacement.
  1. Reply to Ana and ask for a photo of the crack.
  2. When the photo arrives, send a free replacement mug for order TS-48213.
  3. Let her know she can keep the damaged mug.
     ask for: A photo of the crack

  2 calls · 0.3s · replay, no cost
```

## The pattern, in general

Routing is worth it when:

- the inputs fall into **clearly different kinds**, and
- each kind needs **different instructions, data or tools**.

If every email needs the same handling, skip the router. One good prompt beats two average ones.

## Try this

- Add a `"wholesale"` category with its own specialist. How many lines did it take? (That's the maintainability win.)
- Send an email that's both damaged *and* charged twice. What does `confident` say? Should one email become two tickets?
