// Lesson 1 · Tidy up
// npm run lesson1

import { DRAFTS } from "../data/shop.js";
import { applyChanges, tidyUp } from "../features/tidy.js";
import type { Call } from "../model.js";
import * as print from "../print.js";

print.banner("Lesson 1 · Tidy up");

for (const draft of DRAFTS) {
  const calls: Call[] = [];
  print.section(`Draft: ${draft.id}`);
  print.block(print.dim(draft.text));

  const changes = await tidyUp(draft.text, calls);
  print.section("Suggested changes");
  for (const change of changes) {
    const mark = change.applies ? print.green("✓") : print.red("✗ can't apply, text not found");
    console.log(`  ${mark} ${print.red(print.strike(change.before))}`);
    console.log(`    ${print.green(change.after.replaceAll("\n", " ⏎ "))}  ${print.dim(change.why)}`);
  }

  // In the app, the person ticks the changes they want. Here we accept every change that applies.
  print.section("After accepting all");
  print.block(applyChanges(draft.text, changes.filter((c) => c.applies)));
  print.calls(calls);
}

print.note("The model proposed. Plain code applied. In the app, a person picks which changes to keep.");
