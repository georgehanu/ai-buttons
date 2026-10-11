// Lesson 6 · Ship it
// npm run lesson6
//
// Three things that decide whether AI buttons survive real users:
//   1. customer text that tries to give the model orders
//   2. the AI step failing
//   3. what each click costs

import { EMAILS } from "../data/shop.js";
import { fillFromEmail } from "../features/fill.js";
import { checkDraft, draftReply } from "../features/reply.js";
import { routeEmail } from "../features/route.js";
import { tidyUp } from "../features/tidy.js";
import { AIError, costLine, live, MODELS, type Call } from "../model.js";
import { BAD_DRAFT } from "../replays.js";
import * as print from "../print.js";

print.banner("Lesson 6 · Ship it");

// ── 1. Prompt injection ─────────────────────────────────────────────────────
const sam = EMAILS.find((e) => e.id === "hoodie-swap")!;
print.section("1 · An email that gives the AI orders");
print.block(print.dim(sam.body));

const calls: Call[] = [];
const { ticket } = await fillFromEmail(sam.body, calls);
const route = await routeEmail(sam.body, calls);
const reply = await draftReply(sam.body, calls);

console.log(`\n  urgency       ${ticket.urgency}   ${print.dim("(the email asked for urgent)")}`);
console.log(`  routed to     ${route.routedTo}`);
console.log(`  summary       ${ticket.summary}`);
console.log(`  reply draft   ${reply.passed ? print.green("passed the checker") : print.red("failed the checker")}`);
print.block(print.dim(reply.draft));

print.section("Layer 2: the checker, on a bad draft we wrote by hand");
print.block(print.dim(BAD_DRAFT));
const check = await checkDraft(BAD_DRAFT, sam.body, calls, "bad-draft:1");
for (const p of check.problems) console.log(print.red(`  ✗ ${p.rule} "${p.quote}"`) + print.dim(` → ${p.fix}`));

// ── 2. When the AI step fails ───────────────────────────────────────────────
print.section("2 · When the AI step fails");
const typed = "hi, ur parcel is on its way, shud arrive soon";
if (live) MODELS.smart = "claude-model-that-does-not-exist"; // force a real API error
try {
  await tidyUp(typed, []);
} catch (error) {
  if (!(error instanceof AIError)) throw error;
  console.log(print.yellow(`  AI step failed: ${error.message}`));
  console.log(`  The button shows a short message and leaves the text as it was:`);
  print.block(print.dim(typed));
}

// ── 3. What a click costs ───────────────────────────────────────────────────
print.section("3 · What each button cost in this run");
const byButton = new Map<string, Call[]>();
for (const call of calls) {
  const button = ["write", "revise", "check"].includes(call.step) ? "draft + check" : call.step === "extract" ? "fill" : "route";
  byButton.set(button, [...(byButton.get(button) ?? []), call]);
}
for (const [button, list] of byButton) console.log(`  ${button.padEnd(14)} ${costLine(list)}`);
if (live) {
  const usd = calls.reduce((sum, c) => sum + c.usd, 0);
  console.log(print.dim(`\n  This whole lesson: $${usd.toFixed(4)}. Times 1,000 support emails: about $${(usd * 1000).toFixed(2)}.`));
}

print.note("Next: npm run eval. A handful of known emails and the answers you expect, checked on every change.");
