import "server-only";
import { prisma } from "@recap/db";

/** Mailboxes and managers the schedule form can choose from; always the user's own. */
export const loadScheduleFormOptions = (userId: string) =>
  Promise.all([
    prisma.mailbox.findMany({
      where: { userId },
      select: { id: true, email: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.manager.findMany({ where: { userId }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ]);
