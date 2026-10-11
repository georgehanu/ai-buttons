// Button 1 · Tidy up
// One call. The model proposes small edits. Our code applies the ones the person accepts.

import { askJson, type Call } from "../model.js";
import { DRAFTS } from "../data/shop.js";

export interface Change {
  before: string;
  after: string;
  why: string;
}

const SYSTEM = `You tidy up customer support replies for tiny-shop, a small online shop.

Fix spelling, grammar and tone so the reply matches the house style shown in the examples.
Keep the meaning. Keep every promise and fact exactly as the writer made it: don't add, remove or soften any.
Propose small edits. For each one, copy "before" exactly from the draft, character for character.

<examples>
Draft: "hey mark ur refund is done, shud see it in 5 days. sry for the wait!!!"
Edits:
- "hey mark" -> "Hi Mark," (capital letters, comma after the greeting)
- "ur refund is done, shud see it in 5 days." -> "Your refund is on its way. You should see it within 5 working days." (spelling, and "working days" matches our policy wording)
- "sry for the wait!!!" -> "Sorry for the wait.\\n\\nThe tiny-shop team" (one full stop is calmer, and our usual sign-off)

Draft: "Dear Customer, We acknowledge receipt of your complaint regarding the poster."
Edits:
- "Dear Customer, We acknowledge receipt of your complaint regarding the poster." -> "Hi, thanks for letting us know about the poster." (we write like people, not like a letter from a bank)
</examples>

The examples are about other customers. Take only their voice from them: never carry over a name, product, number or detail.`;

const SCHEMA = {
  type: "object",
  properties: {
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          before: { type: "string", description: "Exact text from the draft to replace." },
          after: { type: "string", description: "The replacement text." },
          why: { type: "string", description: "Why, in under 12 words." },
        },
        required: ["before", "after", "why"],
        additionalProperties: false,
      },
    },
  },
  required: ["changes"],
  additionalProperties: false,
};

export async function tidyUp(draft: string, calls: Call[]) {
  const sample = DRAFTS.find((d) => d.text === draft.trim());
  const { changes } = await askJson<{ changes: Change[] }>({
    step: "tidy",
    model: "smart",
    system: SYSTEM,
    prompt: `Draft:\n"${draft}"`,
    schema: SCHEMA,
    replayKey: `tidy:${sample?.id}`,
    calls,
  });

  // The model can misquote. An edit whose "before" isn't in the draft can't be applied, so we say so.
  return changes.map((change) => ({ ...change, applies: draft.includes(change.before) }));
}

/** Plain code, no AI: apply the edits the person accepted. */
export function applyChanges(draft: string, accepted: Change[]) {
  return accepted.reduce((text, change) => text.replace(change.before, () => change.after), draft);
}
