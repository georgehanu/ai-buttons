// Lesson 4 · This week's themes
// npm run lesson4

import { WEEK } from "../data/shop.js";
import { weeklyThemes } from "../features/themes.js";
import type { Call } from "../model.js";
import * as print from "../print.js";

print.banner("Lesson 4 · This week's themes");
console.log(print.dim(`  ${WEEK.length} tickets from the past week…`));

const calls: Call[] = [];
const { themes, wallMs } = await weeklyThemes(calls);

for (const theme of themes) {
  const bar = "█".repeat(theme.count);
  console.log(`\n  ${print.bold(String(theme.count).padStart(2))} ${print.cyan(bar)} ${print.bold(theme.name)}`);
  console.log(`     ${theme.suggestion}`);
  console.log(print.dim(`     tickets ${theme.ticket_ids.join(", ")}`));
}

const labelling = calls.filter((c) => c.step.startsWith("label"));
console.log(print.dim(`\n  ${labelling.length} labelling calls (fast model, 6 at a time) + 1 grouping call (smart model)`));
print.calls(calls, wallMs);

print.note("The model grouped. Code counted. Ask a language model to count 24 things and you'll get 23 sometimes.");
