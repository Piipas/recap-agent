import "server-only";
import { prisma } from "@recap/db";
import { decryptSecret, encryptSecret } from "@/server/crypto";

/** Checks the key against Groq before storing it, so generation never fails on a typo. */
export const saveGroqKey = async (userId: string, apiKey: string) => {
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (response.status === 401 || response.status === 403) return { ok: false as const, error: "Groq rejected this key." };
  if (!response.ok) return { ok: false as const, error: `Groq could not be reached (HTTP ${response.status}).` };

  const data = { keyEnc: encryptSecret(apiKey), keyHint: apiKey.slice(-4) };
  await prisma.groqKey.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return { ok: true as const };
};

export const getGroqKey = async (userId: string) => {
  const key = await prisma.groqKey.findUnique({ where: { userId } });
  return key ? decryptSecret(key.keyEnc) : null;
};
