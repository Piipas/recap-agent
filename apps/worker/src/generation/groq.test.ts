import { afterEach, describe, expect, it, vi } from "vitest";
import { generateReport } from "./groq";

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" }, ...init });

const report = (text: string) =>
  json({
    output: [
      { type: "reasoning", content: [{ type: "reasoning_text", text: "thinking" }] },
      { type: "message", content: [{ type: "output_text", text }] },
    ],
  });

const groqError = (status: number, message: string, headers: Record<string, string> = {}) =>
  json({ error: { message } }, { status, headers });

const mockFetch = (...responses: Response[]) => {
  const fetch = vi.fn(async () => responses.shift() ?? new Response(null, { status: 500 }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateReport", () => {
  it("returns the message text, not the reasoning", async () => {
    mockFetch(report("## Daily Report: 2026-10-14\n\nDone."));

    await expect(generateReport("key", "prompt")).resolves.toBe("## Daily Report: 2026-10-14\n\nDone.");
  });

  it("retries a rate limit after retry-after", async () => {
    const fetch = mockFetch(groqError(429, "Slow down", { "retry-after": "0" }), report("Done."));

    await expect(generateReport("key", "prompt")).resolves.toBe("Done.");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fails at once on a request that can never succeed", async () => {
    const fetch = mockFetch(groqError(413, "Request too large for model on tokens per minute (TPM): Limit 8000"));

    await expect(generateReport("key", "prompt")).rejects.toThrow("too large for your Groq plan");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("gives up after a few rate-limited attempts", async () => {
    const fetch = mockFetch(
      ...Array.from({ length: 3 }, () => groqError(429, "Rate limit reached", { "retry-after": "0" })),
    );

    await expect(generateReport("key", "prompt")).rejects.toThrow("still reached after 3 attempts");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("explains a rejected key", async () => {
    mockFetch(groqError(401, "Invalid API Key"));

    await expect(generateReport("key", "prompt")).rejects.toThrow("Update it in Connections");
  });
});
