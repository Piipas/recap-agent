import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";

/** The model the CLI uses. */
const MODEL = "openai/gpt-oss-120b";
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 90_000;
/** Longest wait between attempts, whatever Groq's retry-after says. */
const MAX_RETRY_DELAY_MS = 60_000;

const responseSchema = z.object({
  output: z.array(
    z.object({
      type: z.string(),
      content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
    }),
  ),
});

const errorSchema = z.object({ error: z.object({ message: z.string() }) });

const errorMessage = async (response: Response) => {
  const parsed = errorSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data.error.message.slice(0, 300) : `HTTP ${response.status}`;
};

const retryDelay = (response: Response, attempt: number) => {
  const seconds = Number(response.headers.get("retry-after"));
  const delay = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 5_000 * attempt;
  return Math.min(delay, MAX_RETRY_DELAY_MS);
};

/**
 * Generates the report with Groq's Responses API. Rate limits and server errors are
 * retried a few times; anything else fails right away with a readable message.
 */
export const generateReport = async (apiKey: string, prompt: string) => {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch("https://api.groq.com/openai/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, input: prompt, reasoning: { effort: "low" } }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.ok) {
      const { output } = responseSchema.parse(await response.json());
      const text = output
        .filter(({ type }) => type === "message")
        .flatMap(({ content = [] }) => content)
        .filter(({ type }) => type === "output_text")
        .map(({ text = "" }) => text)
        .join("")
        .trim();
      if (!text) throw new Error("The AI service returned an empty report. Try again.");
      return text;
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < MAX_ATTEMPTS) {
      await sleep(retryDelay(response, attempt));
      continue;
    }

    const detail = await errorMessage(response);
    if (response.status === 401) throw new Error("Groq rejected your API key. Update it in Connections.");
    if (response.status === 413) throw new Error(`The request was too large for your Groq plan: ${detail}`);
    if (response.status === 429) throw new Error(`Groq's rate limit was still reached after ${attempt} attempts: ${detail}`);
    throw new Error(`The AI service failed (HTTP ${response.status}): ${detail}`);
  }
};
