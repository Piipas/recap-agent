import { prisma } from "@recap/db";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sendFromMailbox } from "../mailboxes/send";
import { sendRecap } from "./send";

vi.mock("../mailboxes/send", () => ({
  sendFromMailbox: vi.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { providerMessageId: "provider-message-id" };
  }),
}));

// Needs a migrated PostgreSQL database: TEST_DATABASE_URL=… pnpm test
describe.skipIf(!process.env.TEST_DATABASE_URL)("sendRecap", () => {
  const userId = "test-user-send";

  beforeEach(async () => {
    vi.mocked(sendFromMailbox).mockClear();
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.user.create({ data: { id: userId, name: "Test", email: "send@example.com" } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  const createRecap = async (status: "DRAFT" | "PENDING_CONFIRMATION") => {
    const mailbox = await prisma.mailbox.create({
      data: {
        userId,
        provider: "GOOGLE",
        providerAccountId: "sub-1",
        email: "me@example.com",
        accessTokenEnc: "unused",
        refreshTokenEnc: "unused",
        accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
        scope: "gmail.send",
      },
    });
    const run = await prisma.recapRun.create({
      data: { userId, day: new Date("2026-10-14T00:00:00Z"), repoTypes: ["USER"], language: "en", status: "SUCCEEDED" },
    });
    return prisma.recap.create({
      data: {
        userId,
        runId: run.id,
        day: run.day,
        subject: "Daily Report: 2026-10-14",
        content: "## Daily Report: 2026-10-14",
        status,
        mailboxId: mailbox.id,
        recipients: ["manager@example.com"],
      },
    });
  };

  it("sends a confirmed recap once, even when confirmed concurrently", async () => {
    const recap = await createRecap("PENDING_CONFIRMATION");

    const results = await Promise.all(Array.from({ length: 4 }, () => sendRecap(recap.id, userId, "MANUAL")));

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(sendFromMailbox).toHaveBeenCalledTimes(1);
    expect((await prisma.recap.findUniqueOrThrow({ where: { id: recap.id } })).status).toBe("SENT");
    expect(await prisma.sendLog.count({ where: { recapId: recap.id, status: "SENT" } })).toBe(1);
  });

  it("refuses to send a recap that was not confirmed, or that belongs to someone else", async () => {
    const draft = await createRecap("DRAFT");
    expect((await sendRecap(draft.id, userId, "MANUAL")).ok).toBe(false);

    await prisma.recap.update({ where: { id: draft.id }, data: { status: "PENDING_CONFIRMATION" } });
    expect((await sendRecap(draft.id, "another-user", "MANUAL")).ok).toBe(false);

    expect(sendFromMailbox).not.toHaveBeenCalled();
  });
});
