import { decryptSecret } from "@recap/core/crypto";
import { prisma } from "@recap/db";

const API_HEADERS = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };

/** Returns a usable token, or marks the connection for reconnect and returns null. */
export const getVerifiedGitHubToken = async (userId: string) => {
  const source = await prisma.gitHubSource.findUnique({ where: { userId } });
  if (!source || source.status !== "ACTIVE") return null;

  const token = decryptSecret(source.accessTokenEnc);
  const response = await fetch("https://api.github.com/user", {
    headers: { ...API_HEADERS, Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) {
    await prisma.gitHubSource.update({
      where: { userId },
      data: { status: "NEEDS_RECONNECT", lastError: "GitHub rejected the saved token (revoked or expired)." },
    });
    return null;
  }
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return token;
};

export const getGroqKey = async (userId: string) => {
  const key = await prisma.groqKey.findUnique({ where: { userId } });
  return key ? decryptSecret(key.keyEnc) : null;
};
