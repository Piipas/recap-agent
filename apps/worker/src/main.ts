import "./load-env";
import { prisma } from "@recap/db";
import { enqueueDueSchedules } from "./enqueue";
import { env } from "./env";
import { claimRuns, processRun } from "./runs";

/** How often the worker looks for due schedules and queued runs. */
const POLL_INTERVAL_MS = 5_000;

const inFlight = new Set<Promise<void>>();
let ticking: Promise<void> = Promise.resolve();
let timer: NodeJS.Timeout | undefined;
let stopping = false;

/** Claims as many runs as there are free slots and generates them in the background. */
const startRuns = async () => {
  const free = env.WORKER_CONCURRENCY - inFlight.size;
  if (free <= 0) return;

  for (const runId of await claimRuns(free)) {
    const task: Promise<void> = processRun(runId)
      .catch((error: unknown) => console.error(`Run ${runId} crashed`, error))
      .finally(() => inFlight.delete(task));
    inFlight.add(task);
  }
};

const tick = async () => {
  try {
    const enqueued = await enqueueDueSchedules(new Date());
    if (enqueued > 0) console.log(`Enqueued ${enqueued} scheduled run(s)`);
    await startRuns();
  } catch (error) {
    // A database hiccup must not stop the worker; the next tick retries.
    console.error("Worker tick failed", error);
  }
  if (!stopping) timer = setTimeout(() => (ticking = tick()), POLL_INTERVAL_MS);
};

/**
 * Stops claiming work and lets in-flight runs finish. A run cut short by a hard kill
 * stays RUNNING and is reclaimed by a worker once it is stale.
 */
const shutdown = async (signal: NodeJS.Signals) => {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  await ticking;
  console.log(`${signal} received, finishing ${inFlight.size} run(s)`);
  await Promise.allSettled(inFlight);
  await prisma.$disconnect();
  process.exit(0);
};

process.once("SIGTERM", (signal) => void shutdown(signal));
process.once("SIGINT", (signal) => void shutdown(signal));

console.log(`Recap worker started (concurrency ${env.WORKER_CONCURRENCY})`);
ticking = tick();
