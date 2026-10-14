import "server-only";
import { prisma } from "@recap/db";
import { toCliRepoType } from "@/lib/recap-options";
import { getVerifiedGitHubToken } from "@/server/connections/github";
import { getGroqKey } from "@/server/connections/groq";
import { runRecapCli } from "./cli-runner";
import { recapSubject } from "./render";

const MAX_ATTEMPTS = 3;
/** A RUNNING run older than this belongs to a function that died (limit is 300 s). */
const STALE_AFTER = "10 minutes";

export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

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

/** Generates the recap for a claimed (RUNNING) run and stores it as a draft. */
export const processRun = async (runId: string) => {
  const run = await prisma.recapRun.findUniqueOrThrow({ where: { id: runId } });

  try {
    const githubToken = await getVerifiedGitHubToken(run.userId);
    if (!githubToken) throw new Error("Connect GitHub (or reconnect it) in Connections.");
    const groqApiKey = await getGroqKey(run.userId);
    if (!groqApiKey) throw new Error("Add your Groq API key in Connections.");

    const day = isoDay(run.day);
    const outcome = await runRecapCli({
      githubToken,
      groqApiKey,
      day,
      repoTypes: run.repoTypes.map(toCliRepoType),
      language: run.language,
    });

    if (outcome.kind === "no-commits") {
      await prisma.recapRun.update({ where: { id: run.id }, data: { status: "SUCCEEDED", finishedAt: new Date() } });
      return null;
    }

    const [recap] = await prisma.$transaction([
      prisma.recap.create({
        data: {
          userId: run.userId,
          runId: run.id,
          day: run.day,
          subject: recapSubject(outcome.markdown, day),
          content: outcome.markdown,
        },
      }),
      prisma.recapRun.update({ where: { id: run.id }, data: { status: "SUCCEEDED", finishedAt: new Date() } }),
    ]);
    return recap;
  } catch (error) {
    console.error(`Recap run ${run.id} failed`, error);
    await failRun(run.id, error);
    return null;
  }
};
