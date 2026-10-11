// Terminal output for the lessons. Just ANSI colours.

import { costLine, live, MODELS, type Call } from "./model.js";

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (text: string) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);

export const dim = paint(2);
export const bold = paint(1);
export const green = paint(32);
export const red = paint(31);
export const yellow = paint(33);
export const cyan = paint(36);
export const strike = paint(9);

export function banner(title: string) {
  console.log(`\n${bold(title)}`);
  console.log(
    dim(
      live
        ? `live · smart: ${MODELS.smart} · fast: ${MODELS.fast}`
        : "replay · pre-written answers for the sample inputs. Add ANTHROPIC_API_KEY to .env to run live.",
    ) + "\n",
  );
}

export function section(title: string) {
  console.log(`\n${cyan(bold(title))}`);
}

export function block(text: string) {
  console.log(text.split("\n").map((line) => `  ${line}`).join("\n"));
}

export function calls(list: Call[], wallMs?: number) {
  console.log(dim(`\n  ${costLine(list, wallMs)}`));
  for (const call of list.length > 8 ? [] : list) {
    console.log(dim(`    ${call.step.padEnd(10)} ${call.model.padEnd(18)} ${call.ms}ms  ${call.inputTokens}→${call.outputTokens} tokens`));
  }
}

export function note(text: string) {
  console.log(yellow(`\n${text}`));
}
