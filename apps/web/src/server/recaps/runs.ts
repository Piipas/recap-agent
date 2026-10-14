import "server-only";
import { isoDay } from "@recap/core/dates";
import { recapSubject } from "@recap/core/recaps/render";
import { sendRecap } from "@recap/core/recaps/send";
import { prisma } from "@recap/db";
import { toCliRepoType } from "@/lib/recap-options";
import { getVerifiedGitHubToken } from "@/server/connections/github";
import { getGroqKey } from "@/server/connections/groq";
import {
  notifyAutoSendFailed,
  notifyAutoSent,
  notifyRecapReady,
  notifyRunFailed,
} from "@/server/email/notifications";
import { runRecapCli } from "./cli-runner";

const MAX_ATTEMPTS = 3;
/** A RUNNING run older than this belongs to a function that died (limit is 300 s). */
const STALE_AFTER = "10 minutes";

/** Atomically moves one QUEUED run to RUNNING; false if someone else got it first. */
export const claimRun = async (runId: string) => {
  const claimed = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "recap_run"
    SET "status" = 'RUNNING', "startedAt" = now(), "attempts" = "attempts" + 1
    WHERE "id" = ${runId} AND "status" = 'QUEUED'
    RETURNING "id"`;
  return claimed.length === 1;
};

/**
 * Claims up to `limit` runs: queued ones, plus runs stuck in RUNNING whose function
 * died. SKIP LOCKED lets concurrent cron invocations split the work without overlap.
 */
export const claimRuns = async (limit: number) => {
  await prisma.$executeRaw`
    UPDATE "recap_run"
    SET "status" = 'FAILED', "finishedAt" = now(), "error" = 'Generation did not finish after several attempts.'
    WHERE "status" = 'RUNNING' AND "startedAt" < now() - ${STALE_AFTER}::interval AND "attempts" >= ${MAX_ATTEMPTS}`;

  const claimed = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "recap_run"
    SET "status" = 'RUNNING', "startedAt" = now(), "attempts" = "attempts" + 1
    WHERE "id" IN (
      SELECT "id" FROM "recap_run"
      WHERE "attempts" < ${MAX_ATTEMPTS}
        AND ("status" = 'QUEUED' OR ("status" = 'RUNNING' AND "startedAt" < now() - ${STALE_AFTER}::interval))
      ORDER BY "createdAt"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"`;
  return claimed.map(({ id }) => id);
};

const failRun = (runId: string, error: unknown) =>
  prisma.recapRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      finishedAt: new Date(),
      error: error instanceof Error ? error.message.slice(0, 1000) : "Generation failed.",
    },
  });

/**
 * Generates the recap for a claimed (RUNNING) run. Manual runs produce a DRAFT.
 * Scheduled runs produce a recap waiting for confirmation (when the schedule names a
 * mailbox and recipients) and email the user a review link; only schedules with the
 * explicit auto-send opt-in send without that confirmation.
 */
export const processRun = async (runId: string) => {
  const run = await prisma.recapRun.findUniqueOrThrow({
    where: { id: runId },
    include: {
      user: { select: { email: true } },
      schedule: { include: { recipients: { select: { email: true } } } },
    },
  });
  const { schedule } = run;
  const day = isoDay(run.day);

  let recap;
  try {
    const githubToken = await getVerifiedGitHubToken(run.userId);
    if (!githubToken) throw new Error("Connect GitHub (or reconnect it) in Connections.");
    const groqApiKey = await getGroqKey(run.userId);
    if (!groqApiKey) throw new Error("Add your Groq API key in Connections.");

    const outcome = await runRecapCli({
      githubToken,
      groqApiKey,
      day,
      repoTypes: run.repoTypes.map(toCliRepoType),
      language: run.language,
    });

    if (outcome.kind === "no-commits") {
      await prisma.recapRun.update({ where: { id: run.id }, data: { status: "SUCCEEDED", finishedAt: new Date() } });
      return;
    }

    const recipients = schedule?.recipients.map(({ email }) => email) ?? [];
    const addressed = schedule?.mailboxId != null && recipients.length > 0;

    [recap] = await prisma.$transaction([
      prisma.recap.create({
        data: {
          userId: run.userId,
          runId: run.id,
          day: run.day,
          subject: recapSubject(outcome.markdown, day),
          content: outcome.markdown,
          ...(addressed ? { status: "PENDING_CONFIRMATION", mailboxId: schedule.mailboxId, recipients } : {}),
        },
      }),
      prisma.recapRun.update({ where: { id: run.id }, data: { status: "SUCCEEDED", finishedAt: new Date() } }),
    ]);
  } catch (error) {
    console.error(`Recap run ${run.id} failed`, error);
    const failed = await failRun(run.id, error);
    if (schedule) await notifyRunFailed(run.user, schedule.name, day, failed.error ?? "Generation failed.");
    return;
  }

  if (!schedule) return;
  if (schedule.autoSend && recap.status === "PENDING_CONFIRMATION") {
    const result = await sendRecap(recap.id, run.userId, "AUTO");
    if (result.ok) await notifyAutoSent(run.user, recap, result.recipients);
    else await notifyAutoSendFailed(run.user, recap, result.error);
  } else {
    await notifyRecapReady(run.user, recap, schedule.name);
  }
};
