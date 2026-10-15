import { z } from "zod";

const API = "https://api.github.com";
const HEADERS = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
const REQUEST_TIMEOUT_MS = 30_000;

export const githubRequest = (token: string, url: string) =>
  fetch(url.startsWith("https://") ? url : `${API}${url}`, {
    headers: { ...HEADERS, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

/** A readable error for a failed GitHub response; `what` names what was being read. */
export const githubError = (response: Response, what: string) => {
  if (response.status === 401) return new Error("GitHub rejected the saved token. Reconnect GitHub in Connections.");
  if (response.status === 403 || response.status === 429) {
    return new Error(`GitHub refused access to ${what}, or its rate limit was reached. Try again later.`);
  }
  if (response.status === 404) return new Error(`GitHub could not find ${what}, or your connection cannot access it.`);
  return new Error(`GitHub returned HTTP ${response.status} while reading ${what}.`);
};

const nextPage = (response: Response) => /<([^>]+)>;\s*rel="next"/.exec(response.headers.get("link") ?? "")?.[1];

/**
 * Pages of a GitHub list endpoint, following `Link: rel="next"`, at most `maxPages`.
 * A 409 (empty repository) ends the list.
 */
export async function* githubPages<T>(
  token: string,
  url: string,
  schema: z.ZodType<T>,
  what: string,
  maxPages = Number.POSITIVE_INFINITY,
): AsyncGenerator<T[]> {
  let next: string | undefined = url;
  for (let page = 0; next && page < maxPages; page++) {
    const response = await githubRequest(token, next);
    if (response.status === 409) return;
    if (!response.ok) throw githubError(response, what);
    yield z.array(schema).parse(await response.json());
    next = nextPage(response);
  }
}
