import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { env } from "@/env";
import { claimRuns, processRun } from "@/server/recaps/runs";
import { enqueueDueSchedules } from "@/server/schedules/enqueue";

// Each run spawns the CLI (up to 240 s); a few run in parallel per tick.
export const maxDuration = 300;
const RUNS_PER_TICK = 3;

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Vercel Cron calls this every minute with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: NextRequest) {
  const provided = digest(request.headers.get("authorization") ?? "");
  if (!timingSafeEqual(provided, digest(`Bearer ${env.CRON_SECRET}`))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enqueued = await enqueueDueSchedules(new Date());
  const runIds = await claimRuns(RUNS_PER_TICK);
  await Promise.all(runIds.map((runId) => processRun(runId)));

  return Response.json({ enqueued, processed: runIds.length });
}
