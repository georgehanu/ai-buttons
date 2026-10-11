// Lesson 5 · Draft and check
// npm run lesson5

import { DRAFTS, EMAILS } from "../data/shop.js";
import { checkDraft, draftReply } from "../features/reply.js";
import type { Call } from "../model.js";
import * as print from "../print.js";

print.banner("Lesson 5 · Draft and check");

for (const email of EMAILS.slice(0, 2)) {
  const calls: Call[] = [];
  print.section(email.subject);

  const result = await draftReply(email.body, calls);
  result.attempts.forEach(({ draft, check }, i) => {
    console.log(print.bold(i === 0 ? "\n  First draft" : "\n  After one targeted revision"));
    print.block(print.dim(draft));
    if (check.pass) console.log(print.green("  ✓ checker: no problems"));
    for (const p of check.problems) console.log(print.red(`  ✗ ${p.rule} "${p.quote}"`) + print.dim(` → ${p.fix}`));
  });

  console.log(
    result.passed
      ? print.green("\n  Ready for a person to read, edit and send. Nothing has been sent.")
      : print.yellow("\n  Problems left after the revision. A person sees the draft with them highlighted."),
  );
  print.calls(calls);
}

// The checker doesn't care who wrote the reply. Here it reviews one a person typed.
const human = DRAFTS.find((d) => d.id === "delay-reply")!;
const tom = EMAILS.find((e) => e.id === "where-is-it")!;
const calls: Call[] = [];
print.section("A reply a person wrote, same checker");
print.block(print.dim(human.text));
const check = await checkDraft(human.text, tom.body, calls, "human:delay-reply");
if (check.pass) console.log(print.green("  ✓ checker: no problems"));
for (const p of check.problems) console.log(print.red(`  ✗ ${p.rule} "${p.quote}"`) + print.dim(` → ${p.fix}`));
print.calls(calls);

print.note("Write, check, fix what was flagged, check again. Then it's a person's call. The code never lets it guess a third time.");
