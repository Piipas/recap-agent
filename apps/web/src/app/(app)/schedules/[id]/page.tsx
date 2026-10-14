import { prisma } from "@recap/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/server/session";
import { loadScheduleFormOptions } from "../form-data";
import { ScheduleForm } from "../schedule-form";

export const metadata: Metadata = { title: "Edit schedule" };

export default async function EditSchedulePage({ params }: PageProps<"/schedules/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const [schedule, [mailboxes, managers]] = await Promise.all([
    prisma.schedule.findFirst({ where: { id, userId: user.id }, include: { recipients: { select: { id: true } } } }),
    loadScheduleFormOptions(user.id),
  ]);
  if (!schedule) notFound();

  return (
    <>
      <PageHeader title="Edit schedule" description={schedule.name} />
      <Card>
        <CardContent>
          <ScheduleForm
            scheduleId={schedule.id}
            mailboxes={mailboxes}
            managers={managers}
            values={{
              name: schedule.name,
              daysOfWeek: schedule.daysOfWeek,
              timeOfDay: schedule.timeOfDay,
              timezone: schedule.timezone,
              repoTypes: schedule.repoTypes,
              language: schedule.language,
              mailboxId: schedule.mailboxId,
              managerIds: schedule.recipients.map((recipient) => recipient.id),
              autoSend: schedule.autoSend,
              enabled: schedule.enabled,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
