// Lesson 2 · Fill from email
// npm run lesson2

import { EMAILS } from "../data/shop.js";
import { fillFromEmail } from "../features/fill.js";
import type { Call } from "../model.js";
import * as print from "../print.js";

print.banner("Lesson 2 · Fill from email");

for (const email of EMAILS.slice(0, 3)) {
  const calls: Call[] = [];
  print.section(`${email.subject}  ${print.dim(`<${email.from}>`)}`);
  print.block(print.dim(email.body));

  const { ticket, warnings } = await fillFromEmail(email.body, calls);
  console.log();
  for (const [field, value] of Object.entries(ticket)) {
    if (field === "uncertain") continue;
    const shown = value === null ? print.yellow("unknown") : String(value);
    const unsure = ticket.uncertain.includes(field) ? print.yellow("  ← check this") : "";
    console.log(`  ${field.padEnd(14)} ${shown}${unsure}`);
  }
  for (const warning of warnings) console.log(print.yellow(`  ! ${warning}`));
  print.calls(calls);
}

print.note('"unknown" is a correct answer. A form that invents an order number is worse than an empty one.');
