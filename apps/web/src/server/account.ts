import "server-only";
import { decryptSecret } from "@recap/core/crypto";
import { prisma } from "@recap/db";
import { symmetricDecrypt } from "better-auth/crypto";
import { env } from "@/env";
import { revokeGitHubGrant, revokeGitHubToken } from "@/server/connections/github";
import { disconnectMailbox } from "@/server/mailboxes/connect";

/** The user's GitHub tokens (sign-in and commit source), grouped by GitHub user ID. */
const githubTokens = async (userId: string) => {
  const [signIn, source] = await Promise.all([
    prisma.account.findFirst({ where: { userId, providerId: "github" }, select: { accountId: true, accessToken: true } }),
    prisma.gitHubSource.findUnique({ where: { userId }, select: { githubUserId: true, accessTokenEnc: true } }),
  ]);

  const byGitHubUser = new Map<string, string[]>();
  const add = (githubUserId: string, token: string) =>
    byGitHubUser.set(githubUserId, [...(byGitHubUser.get(githubUserId) ?? []), token]);

  // Better Auth encrypts sign-in tokens with its secret (account.encryptOAuthTokens).
  if (signIn?.accessToken) {
    add(signIn.accountId, await symmetricDecrypt({ key: env.BETTER_AUTH_SECRET, data: signIn.accessToken }));
  }
  if (source) add(source.githubUserId, decryptSecret(source.accessTokenEnc));
  return byGitHubUser;
};

/** Whether another Recap Agent account signs in with, or reads commits as, this GitHub user. */
const sharedGitHubUser = async (githubUserId: string, userId: string) => {
  const [accounts, sources] = await Promise.all([
    prisma.account.count({ where: { providerId: "github", accountId: githubUserId, userId: { not: userId } } }),
    prisma.gitHubSource.count({ where: { githubUserId, userId: { not: userId } } }),
  ]);
  return accounts + sources > 0;
};

/**
 * Revokes the app's GitHub authorization. The whole grant is deleted, which also
 * removes Recap Agent from the user's authorized GitHub apps, unless another account
 * relies on the same GitHub user: then only this account's tokens are revoked.
 */
const revokeGitHub = async (userId: string) => {
  for (const [githubUserId, tokens] of await githubTokens(userId)) {
    if (!(await sharedGitHubUser(githubUserId, userId)) && (await revokeGitHubGrant(tokens))) continue;
    for (const token of tokens) await revokeGitHubToken(token);
  }
};

/**
 * Deletes a user and everything they own. Access to GitHub (sign-in and commit
 * source) and Google mailboxes is revoked with the provider first (Microsoft has no
 * per-token revocation, so those tokens are only deleted); the database cascades from
 * the user to sessions, sign-in accounts, connections, managers, schedules, runs,
 * recaps and send logs.
 */
export const deleteAccount = async (userId: string) => {
  // Best effort: a failed revocation must not keep the account from being deleted.
  await revokeGitHub(userId).catch((error: unknown) => console.error("GitHub revocation failed", error));
  const mailboxes = await prisma.mailbox.findMany({ where: { userId }, select: { id: true } });
  for (const { id } of mailboxes) await disconnectMailbox(userId, id);
  await prisma.user.delete({ where: { id: userId } });
};
