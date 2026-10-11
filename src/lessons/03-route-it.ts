// Lesson 3 · Route it
// npm run lesson3

import { EMAILS } from "../data/shop.js";
import { routeEmail } from "../features/route.js";
import type { Call } from "../model.js";
import * as print from "../print.js";

print.banner("Lesson 3 · Route it");

for (const email of EMAILS) {
  const calls: Call[] = [];
  print.section(email.subject);

  const result = await routeEmail(email.body, calls);
  const { category, confident, reason } = result.classification;
  console.log(`  ${print.bold(category)}${confident ? "" : print.yellow(" (not sure)")}  ${print.dim(reason)}`);

  if (!result.next) {
    console.log(print.yellow("  → sent to a person, no AI suggestions"));
  } else {
    result.next.steps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
    for (const item of result.next.ask_customer_for) console.log(print.dim(`     ask for: ${item}`));
  }
  print.calls(calls);
}

print.note("A cheap model sorted. Code picked the specialist. Only the specialist used the expensive model.");
