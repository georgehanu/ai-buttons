// Every AI button goes through this file.
//
//   ask()      one model call, text back
//   askJson()  one model call, JSON back, shaped by a JSON schema
//
// Live mode calls Claude with the official Anthropic SDK.
// Replay mode returns pre-written answers for the sample inputs, so everything runs without an API key.

import Anthropic from "@anthropic-ai/sdk";
import { REPLAYS } from "./replays.js";

try {
  process.loadEnvFile();
} catch {
  // no .env file
}

/** Two models: a strong one where quality matters, a fast cheap one for simple steps. */
export const MODELS = {
  smart: process.env.SMART_MODEL || "claude-opus-5-5",
  fast: process.env.FAST_MODEL || "claude-haiku-5-5",
};

// USD per million tokens (input, output). Check current prices before relying on these.
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-haiku-5-5": [0.1, 0.5],
};

export const live = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = live ? new Anthropic() : null;

export interface Call {
  step: string;
  model: string;
  ms: number;
  inputTokens: number;
  outputTokens: number;
  usd: number;
}

export interface AskOptions {
  /** Shown in traces and the UI, e.g. "classify". */
  step: string;
  model: keyof typeof MODELS;
  system: string;
  prompt: string;
  effort?: "low" | "medium" | "high";
  /** Which pre-written answer to use in replay mode. */
  replayKey: string;
  /** Collects one entry per call, for the cost line under each button. */
  calls: Call[];
}

/** The AI step failed. Callers catch this and fall back to the non-AI behaviour. */
export class AIError extends Error {}

export async function ask(options: AskOptions): Promise<string> {
  return request(options);
}

export async function askJson<T>(options: AskOptions & { schema: Record<string, unknown> }): Promise<T> {
  const text = await request(options);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AIError(`The ${options.step} step returned something that isn't JSON.`);
  }
}

async function request(options: AskOptions & { schema?: Record<string, unknown> }): Promise<string> {
  const started = Date.now();
  const model = MODELS[options.model];

  if (!client) {
    const answer = REPLAYS[options.replayKey];
    if (answer === undefined) {
      throw new AIError("Replay mode only knows the sample inputs. Add ANTHROPIC_API_KEY to .env to try your own.");
    }
    await new Promise((resolve) => setTimeout(resolve, 150)); // a little realism
    options.calls.push({ step: options.step, model: "replay", ms: Date.now() - started, inputTokens: 0, outputTokens: 0, usd: 0 });
    return typeof answer === "string" ? answer : JSON.stringify(answer);
  }

  const smart = options.model === "smart";
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model,
      max_tokens: 8000,
      system: options.system,
      messages: [{ role: "user", content: options.prompt }],
      output_config: {
        effort: options.effort ?? (smart ? "medium" : "low"),
        ...(options.schema ? { format: { type: "json_schema" as const, schema: options.schema } } : {}),
      },
      // On the smart model: if a safety classifier declines, retry on Anthropic's recommended fallback.
      ...(smart ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) throw new AIError(`The AI service returned an error (${error.status}).`);
    throw error;
  }

  const { input_tokens, output_tokens } = response.usage;
  const [inPrice, outPrice] = PRICES[model] ?? [0, 0];
  options.calls.push({
    step: options.step,
    model,
    ms: Date.now() - started,
    inputTokens: input_tokens,
    outputTokens: output_tokens,
    usd: (input_tokens * inPrice + output_tokens * outPrice) / 1_000_000,
  });

  if (response.stop_reason === "refusal") throw new AIError("The model declined this request.");
  if (response.stop_reason === "max_tokens") throw new AIError("The answer was cut off.");

  return response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
}

/** Wrap text from outside (customers, the web) so the model treats it as data, not instructions. */
export function untrusted(tag: string, text: string) {
  return `<${tag}>\n${text.replaceAll(`</${tag}>`, "")}\n</${tag}>`;
}

/** "2 calls · 1.4s · $0.0031". Pass wallMs when calls ran in parallel. */
export function costLine(calls: Call[], wallMs?: number) {
  const ms = wallMs ?? calls.reduce((sum, call) => sum + call.ms, 0);
  const usd = calls.reduce((sum, call) => sum + call.usd, 0);
  const money = calls.every((call) => call.model === "replay") ? "replay, no cost" : `$${usd.toFixed(4)}`;
  return `${calls.length} call${calls.length === 1 ? "" : "s"} · ${(ms / 1000).toFixed(1)}s · ${money}`;
}
