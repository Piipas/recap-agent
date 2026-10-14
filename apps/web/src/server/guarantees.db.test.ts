import { prisma } from "@recap/db";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sendFromMailbox } from "@/server/mailboxes/send";
import { claimRuns } from "@/server/recaps/runs";
import { sendRecap } from "@/server/recaps/send";
import { enqueueDueSchedules } from "@/server/schedules/enqueue";

vi.mock("@/server/mailboxes/send", () => ({
  sendFromMailbox: vi.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { providerMessageId: "provider-message-id" };
  }),
}));

// Needs a migrated PostgreSQL database: TEST_DATABASE_URL=… pnpm test
describe.skipIf(!process.env.TEST_DATABASE_URL)("database guarantees", () => {
  const userId = "test-user-guarantees";

  beforeEach(async () => {
    vi.mocked(sendFromMailbox).mockClear();
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.user.create({ data: { id: userId, name: "Test", email: "guarantees@example.com" } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  const createDueSchedule = (nextRunAt: Date) =>
    prisma.schedule.create({
      data: {
        userId,
        name: "Daily",
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeOfDay: "18:00",
        timezone: "Europe/Paris",
        repoTypes: ["USER"],
        language: "en",
        nextRunAt,
      },
    });

  it("enqueues a due slot exactly once under concurrent ticks and advances nextRunAt", async () => {
    const slot = new Date("2026-10-14T16:00:00Z");
    const schedule = await createDueSchedule(slot);
    const now = new Date("2026-10-14T16:00:30Z");

    const results = await Promise.all(Array.from({ length: 5 }, () => enqueueDueSchedules(now)));

    expect(results.reduce((sum, count) => sum + count, 0)).toBe(1);
    const runs = await prisma.recapRun.findMany({ where: { scheduleId: schedule.id } });
    expect(runs).toHaveLength(1);
    expect(runs[0]?.scheduledFor).toEqual(slot);
    expect(runs[0]?.day.toISOString().slice(0, 10)).toBe("2026-10-14");
    expect((await prisma.schedule.findUniqueOrThrow({ where: { id: schedule.id } })).nextRunAt).toEqual(
      new Date("2026-10-15T16:00:00Z"),
    );
  });

  it("never inserts the same slot twice, even if nextRunAt is rewound", async () => {
    const slot = new Date("2026-10-14T16:00:00Z");
    const schedule = await createDueSchedule(slot);
    await enqueueDueSchedules(new Date("2026-10-14T16:00:30Z"));
    await prisma.schedule.update({ where: { id: schedule.id }, data: { nextRunAt: slot } });

    expect(await enqueueDueSchedules(new Date("2026-10-14T16:01:30Z"))).toBe(0);
    expect(await prisma.recapRun.count({ where: { scheduleId: schedule.id } })).toBe(1);
  });

  it("splits queued runs between concurrent claimers", async () => {
    await prisma.recapRun.createMany({
      data: Array.from({ length: 6 }, () => ({
        userId,
        day: new Date("2026-10-14T00:00:00Z"),
        repoTypes: ["USER" as const],
        language: "en",
      })),
    });

    const claims = await Promise.all([claimRuns(3), claimRuns(3), claimRuns(3)]);
    const claimed = claims.flat();

    expect(claimed).toHaveLength(6);
    expect(new Set(claimed).size).toBe(6);
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
