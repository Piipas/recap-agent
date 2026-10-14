"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { prepareSendAction } from "./actions";

type PrepareSendFormProps = {
  recapId: string;
  mailboxes: { id: string; email: string }[];
  managers: { id: string; name: string; email: string }[];
  defaultMailboxId: string | undefined;
  defaultRecipients: string[];
};

export function PrepareSendForm({
  recapId,
  mailboxes,
  managers,
  defaultMailboxId,
  defaultRecipients,
}: PrepareSendFormProps) {
  const [state, formAction, pending] = useActionState(prepareSendAction.bind(null, recapId), null);

  if (mailboxes.length === 0 || managers.length === 0) {
    return (
      <div className="text-muted-foreground space-y-3 text-sm">
        <p>
          To send this recap you need{" "}
          {[mailboxes.length === 0 ? "a connected mailbox" : null, managers.length === 0 ? "at least one manager" : null]
            .filter((item) => item !== null)
            .join(" and ")}
          .
        </p>
        <div className="flex gap-2">
          {mailboxes.length === 0 ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/connections">Connect a mailbox</Link>
            </Button>
          ) : null}
          {managers.length === 0 ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/managers">Add managers</Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="mailboxId">Send from</Label>
        <Select name="mailboxId" defaultValue={defaultMailboxId ?? mailboxes[0]?.id}>
          <SelectTrigger id="mailboxId" className="w-full">
            <SelectValue placeholder="Choose a mailbox" />
          </SelectTrigger>
          <SelectContent>
            {mailboxes.map((mailbox) => (
              <SelectItem key={mailbox.id} value={mailbox.id}>
                {mailbox.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">Send to</legend>
        {managers.map((manager) => (
          <div key={manager.id} className="flex items-center gap-2">
            <Checkbox
              id={`manager-${manager.id}`}
              name="managerIds"
              value={manager.id}
              defaultChecked={defaultRecipients.includes(manager.email)}
            />
            <Label htmlFor={`manager-${manager.id}`} className="font-normal">
              {manager.name} <span className="text-muted-foreground">({manager.email})</span>
            </Label>
          </div>
        ))}
      </fieldset>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Review before sending <ArrowRight />
        </Button>
        {state && !state.ok ? <p className="text-destructive text-sm">{state.error}</p> : null}
      </div>
    </form>
  );
}
