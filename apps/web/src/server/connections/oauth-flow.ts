import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret } from "@recap/core/crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/env";

export type OAuthTarget = "github" | "google" | "microsoft";

const MAX_AGE_SECONDS = 10 * 60;
const cookieName = (target: OAuthTarget) => `recap_oauth_${target}`;

const pendingSchema = z.object({
  state: z.string(),
  codeVerifier: z.string(),
  userId: z.string(),
  createdAt: z.number(),
});

export const callbackUrl = (path: string) => new URL(path, env.BETTER_AUTH_URL).toString();

/**
 * Starts an authorization-code + PKCE flow bound to the signed-in user. State and
 * verifier live in an encrypted, short-lived, httpOnly cookie.
 */
export const startOAuthFlow = async (target: OAuthTarget, userId: string) => {
  const state = randomBytes(24).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  (await cookies()).set(
    cookieName(target),
    encryptSecret(JSON.stringify({ state, codeVerifier, userId, createdAt: Date.now() })),
    {
      httpOnly: true,
      secure: env.BETTER_AUTH_URL.startsWith("https://"),
      sameSite: "lax",
      path: "/api",
      maxAge: MAX_AGE_SECONDS,
    },
  );

  return { state, codeChallenge };
};

/** Returns the PKCE verifier if the callback belongs to this user's pending flow. */
export const finishOAuthFlow = async (target: OAuthTarget, userId: string, state: string | null) => {
  const jar = await cookies();
  const raw = jar.get(cookieName(target))?.value;
  jar.delete({ name: cookieName(target), path: "/api" });
  if (!raw || !state) return null;

  try {
    const pending = pendingSchema.parse(JSON.parse(decryptSecret(raw)));
    const fresh = Date.now() - pending.createdAt < MAX_AGE_SECONDS * 1000;
    return fresh && pending.state === state && pending.userId === userId ? pending.codeVerifier : null;
  } catch {
    return null;
  }
};
