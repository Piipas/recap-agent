import "server-only";
import { decryptSecret, encryptSecret } from "@recap/core/crypto";
import { githubPages } from "@recap/core/github";
import { prisma } from "@recap/db";
import { z } from "zod";
import { env } from "@/env";
import { callbackUrl } from "./oauth-flow";

/** Read access to commits in private and organization repositories (the scopes the CLI requests too). */
export const GITHUB_SOURCE_SCOPES = ["repo", "read:user", "read:org"] as const;
export const GITHUB_SOURCE_CALLBACK = "/api/connections/github/callback";

const API_HEADERS = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
/** An organization with more repositories than this many pages of 100 is cut off in the picker. */
const MAX_REPO_PAGES = 10;

export const githubAuthorizeUrl = (state: string, codeChallenge: string) => {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: callbackUrl(GITHUB_SOURCE_CALLBACK),
    scope: GITHUB_SOURCE_SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    allow_signup: "false",
  }).toString();
  return url.toString();
};

const tokenResponse = z.union([
  z.object({ access_token: z.string().min(1), scope: z.string() }),
  z.object({ error: z.string(), error_description: z.string().optional() }),
]);

export const connectGitHubSource = async (userId: string, code: string, codeVerifier: string) => {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl(GITHUB_SOURCE_CALLBACK),
      code_verifier: codeVerifier,
    }),
  });
  const token = tokenResponse.parse(await response.json());
  if ("error" in token) throw new Error(token.error_description ?? token.error);

  const granted = token.scope.split(",").map((scope) => scope.trim());
  if (!GITHUB_SOURCE_SCOPES.every((scope) => granted.includes(scope))) {
    throw new Error("GitHub did not grant the repository access recaps need.");
  }

  const profile = z
    .object({ id: z.number(), login: z.string() })
    .parse(
      await (await fetch("https://api.github.com/user", {
        headers: { ...API_HEADERS, Authorization: `Bearer ${token.access_token}` },
      })).json(),
    );

  const data = {
    githubUserId: String(profile.id),
    login: profile.login,
    accessTokenEnc: encryptSecret(token.access_token),
    scope: granted.join(" "),
    status: "ACTIVE" as const,
    lastError: null,
  };
  await prisma.gitHubSource.upsert({ where: { userId }, create: { userId, ...data }, update: data });
};

export const disconnectGitHubSource = async (userId: string) => {
  const source = await prisma.gitHubSource.findUnique({ where: { userId } });
  if (!source) return;

  // Revoke this token only (not the whole app grant, which also backs sign-in).
  const basic = Buffer.from(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`).toString("base64");
  await fetch(`https://api.github.com/applications/${env.GITHUB_CLIENT_ID}/token`, {
    method: "DELETE",
    headers: { ...API_HEADERS, Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: decryptSecret(source.accessTokenEnc) }),
  }).catch(() => undefined);

  await prisma.gitHubSource.delete({ where: { userId } });
};

const activeToken = async (userId: string) => {
  const source = await prisma.gitHubSource.findUnique({ where: { userId } });
  return source?.status === "ACTIVE" ? decryptSecret(source.accessTokenEnc) : null;
};

/** Logins of the organizations the user's GitHub connection can see, sorted. */
export const listGitHubOrgs = async (userId: string) => {
  const token = await activeToken(userId);
  if (!token) throw new Error("Connect GitHub in Connections first.");

  const orgs: string[] = [];
  for await (const page of githubPages(token, "/user/orgs?per_page=100", z.object({ login: z.string() }), "your organizations")) {
    orgs.push(...page.map(({ login }) => login));
  }
  return orgs.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
};

/** "org/repo" names of an organization's repositories the user can access, sorted. */
export const listGitHubOrgRepos = async (userId: string, org: string) => {
  const token = await activeToken(userId);
  if (!token) throw new Error("Connect GitHub in Connections first.");

  const repos: string[] = [];
  for await (const page of githubPages(
    token,
    `/orgs/${encodeURIComponent(org)}/repos?type=all&sort=full_name&per_page=100`,
    z.object({ full_name: z.string() }),
    `the repositories of ${org}`,
    MAX_REPO_PAGES,
  )) {
    repos.push(...page.map(({ full_name }) => full_name));
  }
  return repos;
};
