"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { deleteAccountAction } from "@/app/(app)/account-actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DeleteAccountDialogProps = { email: string; open: boolean; onOpenChange: (open: boolean) => void };

/** Deletes the account after the user types their email; the action redirects home. */
export function DeleteAccountDialog({ email, open, onOpenChange }: DeleteAccountDialogProps) {
  const [state, formAction, pending] = useActionState(deleteAccountAction, null);
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form action={formAction} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your recaps, history, schedules, managers and connections, and revokes Recap
              Agent&apos;s access to your GitHub repositories and Gmail mailboxes. Emails already sent are not affected.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="confirmEmail">
              Type <span className="font-medium">{email}</span> to confirm
            </Label>
            <Input
              id="confirmEmail"
              name="confirmEmail"
              type="email"
              autoComplete="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
            {state && !state.ok ? <p className="text-destructive text-sm">{state.error}</p> : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={pending}>
              Cancel
            </AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={!confirmed || pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Delete account
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
