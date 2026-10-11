---
title: Tidy up
lesson: 1
code: src/features/tidy.ts
run: npm run lesson1
---

# Lesson 1 · Tidy up

The smallest useful AI feature: a button under a text box that fixes the wording.

Most apps build it like this: send the text, get new text back, replace the text box. It works, and people quietly stop using it. They can't see what changed, they can't keep half of it, and once in a while it rewrites a sentence they cared about.

We'll build it so the person stays in charge. **The model proposes. Code applies. The person decides.**

## Ask for changes, not a new text

Instead of "rewrite this", we ask for a list of edits:

```json
{
  "changes": [
    { "before": "so sorry bout the mug!!", "after": "I'm so sorry about the mug.", "why": "Spelling, and one full stop reads calmer." },
    { "before": " thx alot", "after": "\n\nThanks,\nThe tiny-shop team", "why": "Our usual sign-off, on its own line." }
  ]
}
```

The UI shows each change with a checkbox. The person unticks what they don't want and presses **Apply**. Applying is plain code:

```ts
export function applyChanges(draft: string, accepted: Change[]) {
  return accepted.reduce((text, change) => text.replace(change.before, () => change.after), draft);
}
```

No second AI call, no surprises. Untick a change and that sentence stays exactly as it was typed.

## Getting JSON back reliably

We pass a JSON schema with the request:

```ts
const { changes } = await askJson<{ changes: Change[] }>({
  step: "tidy",
  model: "smart",
  system: SYSTEM,
  prompt: `Draft:\n"${draft}"`,
  schema: SCHEMA,
  // …
});
```

Under the hood that's `output_config: { format: { type: "json_schema", schema } }` on the Messages API. Claude's reply is then guaranteed to match the schema, so `JSON.parse` won't fail. (The SDK also has `client.messages.parse()` with a Zod helper if you prefer that. We use the plain schema so you can see what's sent.)

Schemas have one more job: **descriptions are instructions.** `"before": "Exact text from the draft to replace."` is a tiny prompt attached to that one field.

## Trust, but check

The model can still misquote: a different apostrophe, a missing space. Then `before` isn't in the draft and the edit can't be applied. So we check, in code:

```ts
return changes.map((change) => ({ ...change, applies: draft.includes(change.before) }));
```

The UI greys those edits out with "Can't apply: text not found" rather than pretending. Small detail, but it's the difference between a feature people trust and one they double-check every time.

## Teach the tone with two examples

The system prompt includes two short before/after examples in the shop's voice. That's **few-shot prompting**: showing beats describing. "Friendly and plain" means different things to different people. Two examples pin it down.

Examples have a side effect: they leak. Show a model a reply about Mark's refund, and sometimes "5 working days" turns up in Ana's mug reply too. So the prompt says where the examples stop: *"The examples are about other customers. Take only their voice from them: never carry over a name, product, number or detail."*

And one more: *"Keep every promise and fact exactly as the writer made it."* A tidy-up button must never quietly change "within 5 working days" into "soon". Tidying is about wording. Checking promises is a different job, and lesson 5 has a button for that.

## Run it

```bash
npm run lesson1     # in the terminal
npm start           # the app: load a sample draft, press Tidy up
```

## Try this

- Write your own house-style examples. Notice how fast the output changes.
- Remove the "keep every promise" line, run live, and feed it a draft with "we'll refund you tomorrow". Does it survive?
