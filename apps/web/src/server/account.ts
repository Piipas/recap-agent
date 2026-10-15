import "server-only";
import { prisma } from "@recap/db";
import { disconnectGitHubSource } from "@/server/connections/github";
import { disconnectMailbox } from "@/server/mailboxes/connect";

/**
 * Deletes a user and everything they own. Access to GitHub and Google mailboxes is
 * revoked with the provider first (Microsoft has no per-token revocation, so those
 * tokens are only deleted); the database cascades from the user to sessions,
 * sign-in accounts, connections, managers, schedules, runs, recaps and send logs.
 */
export const deleteAccount = async (userId: string) => {
  const mailboxes = await prisma.mailbox.findMany({ where: { userId }, select: { id: true } });
  await disconnectGitHubSource(userId);
  for (const { id } of mailboxes) await disconnectMailbox(userId, id);
  await prisma.user.delete({ where: { id: userId } });
};
