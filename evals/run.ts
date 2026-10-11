// A tiny eval suite: known inputs, the answers we expect, a pass/fail table.
// Run it after every prompt or model change:  npm run eval
//
// It checks what must be true (fields, categories, rule breaks), not exact wording.

import { EMAILS } from "../src/data/shop.js";
import { fillFromEmail, type Ticket } from "../src/features/fill.js";
import { checkDraft } from "../src/features/reply.js";
import { routeEmail } from "../src/features/route.js";
import { live, type Call } from "../src/model.js";
import { BAD_DRAFT } from "../src/replays.js";

const email = (id: string) => EMAILS.find((e) => e.id === id)!.body;

interface Case {
  name: string;
  run: (calls: Call[]) => Promise<string[]>; // returns the problems; empty means pass
}

const expectFields = (ticket: Ticket, expected: Partial<Ticket>) =>
  Object.entries(expected)
    .filter(([field, value]) => JSON.stringify(ticket[field as keyof Ticket]) !== JSON.stringify(value))
    .map(([field, value]) => `${field}: expected ${JSON.stringify(value)}, got ${JSON.stringify(ticket[field as keyof Ticket])}`);

const cases: Case[] = [
  {
    name: "fill · cracked mug: all fields found",
    run: async (calls) =>
      expectFields((await fillFromEmail(email("cracked-mug"), calls)).ticket, {
        customer_name: "Ana Pereira",
        order_number: "TS-48213",
        product: "Mug",
        issue: "damaged",
      }),
  },
  {
    name: "fill · unsure order number is flagged",
    run: async (calls) => {
      const { ticket } = await fillFromEmail(email("where-is-it"), calls);
      return [
        ...expectFields(ticket, { order_number: "TS-48177", issue: "delivery", urgency: "high" }),
        ...(ticket.uncertain.includes("order_number") ? [] : ["order_number should be in uncertain"]),
      ];
    },
  },
  {
    name: "fill · no order number means null, not a guess",
    run: async (calls) => expectFields((await fillFromEmail(email("charged-twice"), calls)).ticket, { order_number: null, issue: "billing" }),
  },
  {
    name: "fill · injected 'mark as urgent' is ignored",
    run: async (calls) => expectFields((await fillFromEmail(email("hoodie-swap"), calls)).ticket, { urgency: "normal", issue: "return_or_exchange" }),
  },
  ...(
    [
      ["cracked-mug", "damaged"],
      ["where-is-it", "shipping"],
      ["charged-twice", "billing"],
      ["hoodie-swap", "returns"],
    ] as const
  ).map(([id, category]) => ({
    name: `route · ${id} → ${category}`,
    run: async (calls: Call[]) => {
      const got = (await routeEmail(email(id), calls)).classification.category;
      return got === category ? [] : [`expected ${category}, got ${got}`];
    },
  })),
  {
    name: "check · bad draft breaks R1 and R5",
    run: async (calls) => {
      const check = await checkDraft(BAD_DRAFT, email("hoodie-swap"), calls, "bad-draft:1");
      const rules = new Set(check.problems.map((p) => p.rule));
      return [
        ...(check.pass ? ["checker passed a draft that promises a refund and a voucher"] : []),
        ...["R1", "R5"].filter((rule) => !rules.has(rule)).map((rule) => `missing ${rule}`),
      ];
    },
  },
];

console.log(`\nEvals · ${live ? "live" : "replay (pre-written answers, so this mostly checks the code)"}\n`);
let failed = 0;
for (const testCase of cases) {
  const calls: Call[] = [];
  let problems: string[];
  try {
    problems = await testCase.run(calls);
  } catch (error) {
    problems = [String((error as Error).message)];
  }
  if (problems.length) failed++;
  console.log(`${problems.length ? "✗" : "✓"} ${testCase.name}`);
  for (const problem of problems) console.log(`    ${problem}`);
}
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exitCode = failed ? 1 : 0;
