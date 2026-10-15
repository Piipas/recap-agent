import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/server/session";
import { loadScheduleFormOptions } from "../form-data";
import { ScheduleForm } from "../schedule-form";

export const metadata: Metadata = { title: "New schedule" };

export default async function NewSchedulePage() {
  const user = await requireUser();
  const [mailboxes, managers] = await loadScheduleFormOptions(user.id);

  return (
    <>
      <PageHeader title="New schedule" description="When should a recap be prepared for you?" />
      <Card>
        <CardContent>
          <ScheduleForm
            scheduleId={null}
            mailboxes={mailboxes}
            managers={managers}
            values={{
              name: "End of day",
              daysOfWeek: [1, 2, 3, 4, 5],
              timeOfDay: "18:00",
              timezone: null,
              repoTypes: ["USER"],
              orgs: [],
              orgRepos: [],
              language: "en",
              mailboxId: mailboxes.find((mailbox) => mailbox.status === "ACTIVE")?.id ?? null,
              managerIds: [],
              autoSend: false,
              enabled: true,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
