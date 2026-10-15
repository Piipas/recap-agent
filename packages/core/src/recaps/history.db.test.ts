import { prisma } from "@recap/db";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deleteHistoryRun } from "./history";

// Needs a migrated PostgreSQL database: TEST_DATABASE_URL=… pnpm test
describe.skipIf(!process.env.TEST_DATABASE_URL)("deleteHistoryRun", () => {
  const userId = "test-user-history";

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.user.create({ data: { id: userId, name: "Test", email: "history@example.com" } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  const createRun = (status: "QUEUED" | "RUNNING" | "SUCCEEDED") =>
    prisma.recapRun.create({
      data: { userId, day: new Date("2026-10-14T00:00:00Z"), repoTypes: ["USER"], language: "en", status },
    });

  const createRecap = async (sendLockedAt: Date | null) => {
    const run = await createRun("SUCCEEDED");
    const recap = await prisma.recap.create({
      data: { userId, runId: run.id, day: run.day, subject: "Daily", content: "## Daily", status: "SENT", sendLockedAt },
    });
    await prisma.sendLog.create({
      data: {
        recapId: recap.id,
        provider: "GOOGLE",
        fromEmail: "me@example.com",
        recipients: ["manager@example.com"],
        trigger: "MANUAL",
        status: "SENT",
      },
    });
    return { run, recap };
  };

  it("deletes a run with its recap and send log", async () => {
    const { run, recap } = await createRecap(null);

    expect(await deleteHistoryRun(run.id, userId)).toBe(true);
    expect(await prisma.recap.count({ where: { id: recap.id } })).toBe(0);
    expect(await prisma.sendLog.count({ where: { recapId: recap.id } })).toBe(0);
  });

  it("deletes a queued run, which cancels it", async () => {
    const run = await createRun("QUEUED");

    expect(await deleteHistoryRun(run.id, userId)).toBe(true);
  });

  it("keeps a run being generated, a recap being sent, and other users' runs", async () => {
    const running = await createRun("RUNNING");
    const { run: sending } = await createRecap(new Date());
    const other = await createRun("SUCCEEDED");

    expect(await deleteHistoryRun(running.id, userId)).toBe(false);
    expect(await deleteHistoryRun(sending.id, userId)).toBe(false);
    expect(await deleteHistoryRun(other.id, "another-user")).toBe(false);
    expect(await prisma.recapRun.count({ where: { userId } })).toBe(3);
  });

  it("deletes a recap whose send lock is stale", async () => {
    const { run } = await createRecap(new Date(Date.now() - 11 * 60_000));

    expect(await deleteHistoryRun(run.id, userId)).toBe(true);
  });
});
