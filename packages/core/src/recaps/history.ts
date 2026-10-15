import { prisma } from "@recap/db";
import { LOCK_STALE_MS } from "./send";

/**
 * Deletes a run of the user's history with its recap and send log. A run the worker
 * is generating, or whose recap is being sent, is left alone: the condition is part
 * of the DELETE, so it cannot race the worker or a send.
 */
export const deleteHistoryRun = async (runId: string, userId: string) => {
  const staleLock = new Date(Date.now() - LOCK_STALE_MS);
  const { count } = await prisma.recapRun.deleteMany({
    where: {
      id: runId,
      userId,
      status: { not: "RUNNING" },
      OR: [{ recap: null }, { recap: { sendLockedAt: null } }, { recap: { sendLockedAt: { lt: staleLock } } }],
    },
  });
  return count === 1;
};
