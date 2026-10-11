// The support desk app. Plain node:http, no framework.
// npm start, then open http://localhost:3000

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { DRAFTS, EMAILS, WEEK } from "./data/shop.js";
import { fillFromEmail } from "./features/fill.js";
import { checkDraft, draftReply } from "./features/reply.js";
import { routeEmail } from "./features/route.js";
import { weeklyThemes } from "./features/themes.js";
import { tidyUp } from "./features/tidy.js";
import { AIError, costLine, live, MODELS, type Call } from "./model.js";
import { BAD_DRAFT, REPLAYS } from "./replays.js";

const PORT = Number(process.env.PORT) || 3000;
const TYPES: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

// One handler per button. Each returns its result plus a cost line for the UI.
const buttons: Record<string, (body: Record<string, string>, calls: Call[]) => Promise<object>> = {
  tidy: async ({ text }, calls) => ({ changes: await tidyUp(text, calls) }),
  fill: ({ email }, calls) => fillFromEmail(email, calls),
  route: ({ email }, calls) => routeEmail(email, calls),
  reply: ({ email }, calls) => draftReply(email, calls),
  // The same checker, run on whatever the person typed.
  check: async ({ email, text }, calls) => ({ check: await checkDraft(text, email, calls, replayIdFor(text)) }),
  themes: async (_, calls) => {
    const result = await weeklyThemes(calls);
    return { ...result, cost: costLine(calls, result.wallMs) };
  },
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/samples") {
    return json(res, 200, { emails: EMAILS, drafts: DRAFTS, week: WEEK, live, models: MODELS });
  }

  const button = url.pathname.match(/^\/api\/(\w+)$/)?.[1];
  if (req.method === "POST" && button && buttons[button]) {
    const calls: Call[] = [];
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      const result = await buttons[button](body, calls);
      return json(res, 200, { cost: costLine(calls), ...result });
    } catch (error) {
      // An AI failure is expected sometimes. The UI shows the message and keeps working without AI.
      if (error instanceof AIError) return json(res, 200, { error: error.message });
      console.error(error);
      return json(res, 500, { error: "Something went wrong on the server." });
    }
  }

  if (req.method === "GET") {
    const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (/^[\w.-]+$/.test(file)) {
      try {
        const content = await readFile(new URL(`../public/${file}`, import.meta.url));
        res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "text/plain" });
        return res.end(content);
      } catch {
        // fall through to 404
      }
    }
  }
  json(res, 404, { error: "Not found" });
}).listen(PORT, () => {
  console.log(`\nSupport desk running at http://localhost:${PORT}`);
  console.log(live ? `live · smart: ${MODELS.smart} · fast: ${MODELS.fast}` : "replay mode · add ANTHROPIC_API_KEY to .env to run live");
});

// Replay mode only: if the text is one of the pre-written drafts, reuse its pre-written check.
function replayIdFor(text: string) {
  if (text.trim() === BAD_DRAFT) return "bad-draft:1";
  const human = DRAFTS.find((d) => d.text === text.trim());
  if (human) return `human:${human.id}`;
  const key = Object.keys(REPLAYS).find((k) => k.startsWith("reply:write:") && REPLAYS[k] === text.trim());
  return key?.slice("reply:write:".length);
}

function json(res: import("node:http").ServerResponse, status: number, data: object) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 100_000) reject(new Error("Body too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
