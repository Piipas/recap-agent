import { prisma } from "@recap/db";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmAction } from "@/components/confirm-action";
import { LocalTime } from "@/components/local-time";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { describeRepoScope, languageLabel } from "@/lib/recap-options";
import { weekdayOptions } from "@/lib/timezones";
import { requireUser } from "@/server/session";
import { deleteScheduleAction } from "./actions";
import { EnabledSwitch } from "./enabled-switch";

export const metadata: Metadata = { title: "Schedules" };

const describeDays = (days: number[]) => {
  if (days.length === 7) return "Every day";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))) return "Weekdays";
  return weekdayOptions
    .filter(({ value }) => days.includes(value))
    .map(({ short }) => short)
    .join(", ");
};

export default async function SchedulesPage() {
  const user = await requireUser();
  const schedules = await prisma.schedule.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { mailbox: { select: { email: true } }, recipients: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader title="Schedules" description="Recaps prepared automatically. You confirm each one unless you opt out.">
        <Button asChild>
          <Link href="/schedules/new">
            <Plus /> New schedule
          </Link>
        </Button>
      </PageHeader>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CalendarClock className="text-muted-foreground size-8" />
            <p className="text-muted-foreground text-sm">No schedules yet.</p>
            <Button asChild variant="outline">
              <Link href="/schedules/new">Create your first schedule</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {schedule.name}
                  {schedule.autoSend ? <Badge>Sends automatically</Badge> : null}
                  {!schedule.enabled ? <Badge variant="outline">Paused</Badge> : null}
                </CardTitle>
                <CardDescription>
                  {describeDays(schedule.daysOfWeek)} at {schedule.timeOfDay} ({schedule.timezone.replaceAll("_", " ")}) ·{" "}
                  {languageLabel(schedule.language)}
                </CardDescription>
                <CardAction>
                  <EnabledSwitch
                    scheduleId={schedule.id}
                    enabled={schedule.enabled}
                    label={`${schedule.enabled ? "Pause" : "Resume"} ${schedule.name}`}
                  />
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <dl className="text-muted-foreground grid gap-1 text-sm">
                  <div>
                    <dt className="sr-only">Next run</dt>
                    <dd>
                      Next:{" "}
                      {schedule.nextRunAt ? (
                        <span className="text-foreground">
                          <LocalTime date={schedule.nextRunAt.toISOString()} />
                        </span>
                      ) : (
                        "not scheduled"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Repositories</dt>
                    <dd>Repositories: {describeRepoScope(schedule)}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Delivery</dt>
                    <dd>
                      {schedule.mailbox && schedule.recipients.length > 0
                        ? `From ${schedule.mailbox.email} to ${schedule.recipients.map(({ name }) => name).join(", ")}`
                        : "Sender and recipients chosen when you review"}
                    </dd>
                  </div>
                </dl>
                <div className="flex gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/schedules/${schedule.id}`}>
                      <Pencil /> Edit
                    </Link>
                  </Button>
                  <ConfirmAction
                    action={deleteScheduleAction.bind(null, schedule.id)}
                    title={`Delete "${schedule.name}"?`}
                    description="No more recaps will be generated from it. Recaps it already produced are kept."
                    confirmLabel="Delete"
                    destructive
                  >
                    <Button variant="ghost" size="sm">
                      <Trash2 /> Delete
                    </Button>
                  </ConfirmAction>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
