import { computeNextRunAt, localDay } from "@recap/core/schedules/next-run";
import { prisma } from "@recap/db";

/**
 * Turns every due schedule into one queued run and advances its nextRunAt, in one
 * transaction. Idempotent and safe under concurrent ticks:
 * - FOR UPDATE SKIP LOCKED: two ticks never pick the same schedule;
 * - unique (scheduleId, scheduledFor): a slot can only ever be inserted once;
 * - nextRunAt jumps to the first slot after `now`, so downtime yields one run for
 *   the missed slot instead of a backlog.
 */
export const enqueueDueSchedules = async (now: Date, limit = 100) =>
  prisma.$transaction(async (tx) => {
    const due = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "schedule"
      WHERE "enabled" AND "nextRunAt" <= ${now}
      ORDER BY "nextRunAt"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED`;
    if (due.length === 0) return 0;

    const schedules = await tx.schedule.findMany({ where: { id: { in: due.map(({ id }) => id) } } });
    let enqueued = 0;

    for (const schedule of schedules) {
      if (!schedule.nextRunAt) continue;
      const { count } = await tx.recapRun.createMany({
        data: {
          userId: schedule.userId,
          scheduleId: schedule.id,
          scheduledFor: schedule.nextRunAt,
          day: new Date(`${localDay(schedule.nextRunAt, schedule.timezone)}T00:00:00Z`),
          repoTypes: schedule.repoTypes,
          language: schedule.language,
        },
        skipDuplicates: true,
      });
      enqueued += count;
      await tx.schedule.update({ where: { id: schedule.id }, data: { nextRunAt: computeNextRunAt(schedule, now) } });
    }
    return enqueued;
  });
