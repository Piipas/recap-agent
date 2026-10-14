import { prisma } from "@recap/db";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { claimRuns } from "@/server/recaps/runs";
import { enqueueDueSchedules } from "@/server/schedules/enqueue";

// Needs a migrated PostgreSQL database: TEST_DATABASE_URL=… pnpm test
describe.skipIf(!process.env.TEST_DATABASE_URL)("database guarantees", () => {
  const userId = "test-user-guarantees";

  beforeEach(async () => {
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
});
