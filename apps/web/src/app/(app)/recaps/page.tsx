import { isoDay } from "@recap/core/dates";
import { prisma } from "@recap/db";
import { AlertCircle, ArrowRight, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { ConfirmAction } from "@/components/confirm-action";
import { LocalTime } from "@/components/local-time";
import { PageHeader } from "@/components/page-header";
import { RunStatusBadge } from "@/components/recap-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { languageLabel } from "@/lib/recap-options";
import { requireUser } from "@/server/session";
import { deleteRunAction } from "./actions";
import { GenerateForm } from "./generate-form";

export const metadata: Metadata = { title: "Recaps" };

/** The worker polls every few seconds; a run queued longer than this was never picked up. */
const UNCLAIMED_AFTER_MS = 2 * 60_000;

export default async function RecapsPage() {
  const user = await requireUser();
  const [github, groqKey, runs] = await Promise.all([
    prisma.gitHubSource.findUnique({ where: { userId: user.id }, select: { status: true } }),
    prisma.groqKey.findUnique({ where: { userId: user.id }, select: { userId: true } }),
    prisma.recapRun.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        recap: { select: { id: true, status: true, subject: true } },
        schedule: { select: { name: true } },
      },
    }),
  ]);

  const missing = [
    github?.status === "ACTIVE" ? null : "a working GitHub connection",
    groqKey ? null : "your Groq API key",
  ].filter((item) => item !== null);
  const inProgress = runs.some((run) => run.status === "QUEUED" || run.status === "RUNNING");
  const unclaimedBefore = new Date(new Date().getTime() - UNCLAIMED_AFTER_MS);

  return (
    <>
      <AutoRefresh active={inProgress} />
      <PageHeader title="Recaps" description="Generate a recap, review it, then send it when you are happy with it." />

      <div className="grid gap-6">
        {missing.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Generate a recap</CardTitle>
              <CardDescription>It is saved as a draft. Nothing is sent until you confirm.</CardDescription>
            </CardHeader>
            <CardContent>
              <GenerateForm today={isoDay(new Date())} />
            </CardContent>
          </Card>
        ) : (
          <Alert>
            <AlertCircle />
            <AlertTitle>Finish setting up</AlertTitle>
            <AlertDescription>
              <p>Recaps need {missing.join(" and ")}.</p>
              <Button asChild size="sm" className="mt-2">
                <Link href="/connections">
                  Open connections <ArrowRight />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recaps yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead className="hidden md:table-cell">Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <div className="font-medium">{isoDay(run.day)}</div>
                        <div className="text-muted-foreground text-xs">{languageLabel(run.language)}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">
                        {run.schedule?.name ?? (run.scheduledFor ? "Deleted schedule" : "Manual")}
                      </TableCell>
                      <TableCell>
                        <RunStatusBadge runStatus={run.status} {...(run.recap ? { recapStatus: run.recap.status } : {})} />
                        {run.status === "FAILED" && run.error ? (
                          <p className="text-muted-foreground mt-1 max-w-xs text-xs break-words">{run.error}</p>
                        ) : null}
                        {run.status === "QUEUED" && run.createdAt < unclaimedBefore ? (
                          <p className="text-muted-foreground mt-1 max-w-xs text-xs">
                            Not picked up yet. Check that the worker service is running.
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        <LocalTime date={run.createdAt.toISOString()} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {run.recap ? (
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/recaps/${run.recap.id}`}>Open</Link>
                            </Button>
                          ) : null}
                          {run.status === "RUNNING" ? null : (
                            <ConfirmAction
                              action={deleteRunAction.bind(null, run.id)}
                              title="Delete from history?"
                              description={
                                run.status === "QUEUED"
                                  ? "The recap will not be generated."
                                  : "The recap and its send history are deleted. Emails already sent are not affected."
                              }
                              confirmLabel="Delete"
                              destructive
                            >
                              <Button variant="ghost" size="icon-sm" aria-label={`Delete the recap for ${isoDay(run.day)}`}>
                                <Trash2 />
                              </Button>
                            </ConfirmAction>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
