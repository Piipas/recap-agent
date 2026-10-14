import { isoDay } from "@recap/core/dates";
import { renderRecapHtml } from "@recap/core/recaps/render";
import { prisma } from "@recap/db";
import { AlertCircle, ArrowLeft, CheckCircle2, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmAction } from "@/components/confirm-action";
import { LocalTime } from "@/components/local-time";
import { RecapStatusBadge } from "@/components/recap-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/server/session";
import { confirmSendAction, editSendAction } from "./actions";
import { PrepareSendForm } from "./prepare-send-form";

export const metadata: Metadata = { title: "Recap" };

export default async function RecapPage({ params }: PageProps<"/recaps/[id]">) {
  const user = await requireUser();
  const { id } = await params;

  const recap = await prisma.recap.findFirst({
    where: { id, userId: user.id },
    include: {
      mailbox: true,
      run: { include: { schedule: { select: { name: true } } } },
      sendLogs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!recap) notFound();

  const editable = recap.status === "DRAFT" || recap.status === "FAILED";
  const [mailboxes, managers] = editable
    ? await Promise.all([
        prisma.mailbox.findMany({
          where: { userId: user.id, status: "ACTIVE" },
          select: { id: true, email: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.manager.findMany({
          where: { userId: user.id },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], []];

  const sending = recap.sendLockedAt !== null;
  const lastFailure = recap.status === "FAILED" ? recap.sendLogs.find((log) => log.status === "FAILED") : undefined;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
        <Link href="/recaps">
          <ArrowLeft /> All recaps
        </Link>
      </Button>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{recap.subject}</h1>
          <p className="text-muted-foreground text-sm">
            {isoDay(recap.day)} · {recap.run.schedule?.name ?? "Manual"} · generated{" "}
            <LocalTime date={recap.createdAt.toISOString()} />
          </p>
        </div>
        <RecapStatusBadge status={recap.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Exactly what your recipients will receive.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="recap-content" dangerouslySetInnerHTML={{ __html: renderRecapHtml(recap.content) }} />
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          {recap.status === "SENT" ? (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Sent</AlertTitle>
              <AlertDescription>
                <p>
                  {recap.sentAt ? <LocalTime date={recap.sentAt.toISOString()} /> : null} to {recap.recipients.join(", ")}
                  {recap.mailbox ? ` from ${recap.mailbox.email}` : ""}.
                </p>
              </AlertDescription>
            </Alert>
          ) : null}

          {lastFailure ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Sending failed</AlertTitle>
              <AlertDescription>
                <p>{lastFailure.error}</p>
                <p>Check the mailbox in Connections, then try again.</p>
              </AlertDescription>
            </Alert>
          ) : null}

          {editable ? (
            <Card>
              <CardHeader>
                <CardTitle>Send this recap</CardTitle>
                <CardDescription>Choose the sender and recipients. You confirm on the next step.</CardDescription>
              </CardHeader>
              <CardContent>
                <PrepareSendForm
                  recapId={recap.id}
                  mailboxes={mailboxes}
                  managers={managers}
                  defaultMailboxId={recap.mailboxId ?? undefined}
                  defaultRecipients={recap.recipients}
                />
              </CardContent>
            </Card>
          ) : null}

          {recap.status === "PENDING_CONFIRMATION" ? (
            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle>Ready to send</CardTitle>
                <CardDescription>Review the preview, then confirm. Nothing has been sent yet.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <dl className="grid gap-2">
                  <div>
                    <dt className="text-muted-foreground">From</dt>
                    <dd className="font-medium">{recap.mailbox?.email ?? "No mailbox selected"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">To</dt>
                    <dd className="font-medium break-words">{recap.recipients.join(", ")}</dd>
                  </div>
                </dl>
                {recap.mailbox?.status === "NEEDS_RECONNECT" ? (
                  <Alert variant="destructive">
                    <AlertCircle />
                    <AlertTitle>Mailbox needs reconnecting</AlertTitle>
                    <AlertDescription>
                      <Link href="/connections" className="underline">
                        Reconnect {recap.mailbox.email}
                      </Link>{" "}
                      before sending.
                    </AlertDescription>
                  </Alert>
                ) : null}
                <div className="flex flex-col gap-2">
                  <ConfirmAction
                    action={confirmSendAction.bind(null, recap.id)}
                    title="Send this recap now?"
                    description={`It will be sent from ${recap.mailbox?.email ?? "your mailbox"} to ${recap.recipients.join(", ")}.`}
                    confirmLabel="Send now"
                  >
                    <Button disabled={sending || !recap.mailbox || recap.mailbox.status !== "ACTIVE"}>
                      <Send /> {sending ? "Sending…" : "Confirm and send"}
                    </Button>
                  </ConfirmAction>
                  <ConfirmAction
                    action={editSendAction.bind(null, recap.id)}
                    title="Change sender or recipients?"
                    description="The recap goes back to draft so you can pick again."
                    confirmLabel="Change"
                  >
                    <Button variant="outline" disabled={sending}>
                      Change sender or recipients
                    </Button>
                  </ConfirmAction>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {recap.sendLogs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Send log</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recap.sendLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground align-top text-xs">
                          <LocalTime date={log.createdAt.toISOString()} />
                          <div>{log.trigger === "AUTO" ? "Auto-send" : "Confirmed by you"}</div>
                        </TableCell>
                        <TableCell className="align-top text-xs whitespace-normal">
                          <Badge variant={log.status === "SENT" ? "secondary" : "destructive"}>
                            {log.status === "SENT" ? "Sent" : "Failed"}
                          </Badge>
                          <div className="text-muted-foreground mt-1 break-words">
                            {log.fromEmail} → {log.recipients.join(", ")}
                          </div>
                          {log.error ? <div className="text-destructive mt-1 break-words">{log.error}</div> : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
