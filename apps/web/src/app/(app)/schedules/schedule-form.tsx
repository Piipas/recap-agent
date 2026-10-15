"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { languageOptions, repoTypeOptions } from "@/lib/recap-options";
import { timezoneOptions, weekdayOptions } from "@/lib/timezones";
import { saveScheduleAction } from "./actions";

export type ScheduleFormValues = {
  name: string;
  daysOfWeek: number[];
  timeOfDay: string;
  timezone: string | null;
  repoTypes: ("USER" | "ORG")[];
  language: string;
  mailboxId: string | null;
  managerIds: string[];
  autoSend: boolean;
  enabled: boolean;
};

type ScheduleFormProps = {
  scheduleId: string | null;
  values: ScheduleFormValues;
  mailboxes: { id: string; email: string; status: "ACTIVE" | "NEEDS_RECONNECT" }[];
  managers: { id: string; name: string; email: string }[];
};

const NO_MAILBOX = "none";
const noopSubscribe = () => () => {};

export function ScheduleForm({ scheduleId, values, mailboxes, managers }: ScheduleFormProps) {
  const [state, formAction, pending] = useActionState(saveScheduleAction.bind(null, scheduleId), null);
  // New schedules default to the browser's timezone; the server render uses UTC.
  const browserTimezone = useSyncExternalStore(
    noopSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "UTC",
  );
  const [timezone, setTimezone] = useState(values.timezone);
  const [mailboxId, setMailboxId] = useState(values.mailboxId ?? NO_MAILBOX);
  const [autoSend, setAutoSend] = useState(values.autoSend);
  const [confirmingAutoSend, setConfirmingAutoSend] = useState(false);

  return (
    <form action={formAction} className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={values.name} placeholder="End of day" required maxLength={80} />
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">Days</legend>
        <div className="flex flex-wrap gap-2">
          {weekdayOptions.map(({ value, short, long }) => (
            <label
              key={value}
              className="has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2"
              title={long}
            >
              <input
                type="checkbox"
                name="daysOfWeek"
                value={value}
                defaultChecked={values.daysOfWeek.includes(value)}
                className="sr-only"
              />
              {short}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="timeOfDay">Time</Label>
          <Input id="timeOfDay" name="timeOfDay" type="time" defaultValue={values.timeOfDay} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select name="timezone" value={timezone ?? browserTimezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezoneOptions.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-muted-foreground -mt-3 text-xs">
        The recap covers that calendar day, in the schedule&apos;s timezone.
      </p>

      <Separator />

      <div className="grid gap-6 sm:grid-cols-2">
        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-medium">Repositories</legend>
          {repoTypeOptions.map(({ value, label }) => (
            <div key={value} className="flex items-center gap-2">
              <Checkbox
                id={`repo-${value}`}
                name="repoTypes"
                value={value}
                defaultChecked={values.repoTypes.includes(value)}
              />
              <Label htmlFor={`repo-${value}`} className="font-normal">
                {label}
              </Label>
            </div>
          ))}
        </fieldset>
        <div className="grid content-start gap-2">
          <Label htmlFor="language">Language</Label>
          <Select name="language" defaultValue={values.language}>
            <SelectTrigger id="language" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map(({ code, label }) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="grid gap-2">
        <Label htmlFor="mailboxId">Send from</Label>
        <input type="hidden" name="mailboxId" value={mailboxId === NO_MAILBOX ? "" : mailboxId} />
        <Select
          value={mailboxId}
          onValueChange={(value) => {
            setMailboxId(value);
            if (value === NO_MAILBOX) setAutoSend(false);
          }}
        >
          <SelectTrigger id="mailboxId" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_MAILBOX}>Decide when reviewing each recap</SelectItem>
            {mailboxes.map((mailbox) => (
              <SelectItem key={mailbox.id} value={mailbox.id}>
                {mailbox.email}
                {mailbox.status === "NEEDS_RECONNECT" ? " (reconnect needed)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {mailboxes.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            <Link href="/connections" className="underline">
              Connect a mailbox
            </Link>{" "}
            to pre-fill the sender.
          </p>
        ) : null}
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">Send to</legend>
        {managers.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            <Link href="/managers" className="underline">
              Add managers
            </Link>{" "}
            to pre-fill recipients.
          </p>
        ) : (
          managers.map((manager) => (
            <div key={manager.id} className="flex items-center gap-2">
              <Checkbox
                id={`manager-${manager.id}`}
                name="managerIds"
                value={manager.id}
                defaultChecked={values.managerIds.includes(manager.id)}
              />
              <Label htmlFor={`manager-${manager.id}`} className="font-normal">
                {manager.name} <span className="text-muted-foreground">({manager.email})</span>
              </Label>
            </div>
          ))
        )}
      </fieldset>

      <Separator />

      <div className="grid gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="enabled">Active</Label>
            <p className="text-muted-foreground text-xs">Paused schedules don&apos;t generate recaps.</p>
          </div>
          <Switch id="enabled" name="enabled" defaultChecked={values.enabled} />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="autoSend">Send automatically</Label>
            <p className="text-muted-foreground text-xs">
              Off: you get an email to review and confirm every recap. On: recaps are sent without asking.
            </p>
          </div>
          <Switch
            id="autoSend"
            name="autoSend"
            checked={autoSend}
            disabled={mailboxId === NO_MAILBOX}
            onCheckedChange={(checked) => (checked ? setConfirmingAutoSend(true) : setAutoSend(false))}
          />
        </div>
      </div>

      <AlertDialog open={confirmingAutoSend} onOpenChange={setConfirmingAutoSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send recaps without confirmation?</AlertDialogTitle>
            <AlertDialogDescription>
              Every recap this schedule generates will be emailed to the selected managers as soon as it is ready,
              without you reviewing it first. You will get an email each time one is sent. You can turn this off at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep confirming</AlertDialogCancel>
            <AlertDialogAction onClick={() => setAutoSend(true)}>Send automatically</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {scheduleId ? "Save schedule" : "Create schedule"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/schedules">Cancel</Link>
        </Button>
        {state && !state.ok ? <p className="text-destructive text-sm">{state.error}</p> : null}
      </div>
    </form>
  );
}
