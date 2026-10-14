"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveManagerAction } from "./actions";

type ManagerFormProps = {
  manager?: { id: string; name: string; email: string };
  onSaved?: () => void;
};

export function ManagerForm({ manager, onSaved }: ManagerFormProps) {
  const [state, formAction, pending] = useActionState(saveManagerAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef(state);
  const prefix = manager ? `manager-${manager.id}` : "manager-new";

  useEffect(() => {
    if (!state?.ok || handled.current === state) return;
    handled.current = state;
    if (state.message) toast.success(state.message);
    if (!manager) formRef.current?.reset();
    onSaved?.();
  }, [state, manager, onSaved]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {manager ? <input type="hidden" name="id" value={manager.id} /> : null}
      <div className="grid gap-2">
        <Label htmlFor={`${prefix}-name`}>Name</Label>
        <Input id={`${prefix}-name`} name="name" defaultValue={manager?.name} placeholder="Ada Lovelace" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${prefix}-email`}>Email</Label>
        <Input
          id={`${prefix}-email`}
          name="email"
          type="email"
          defaultValue={manager?.email}
          placeholder="ada@company.com"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {manager ? "Save" : "Add manager"}
      </Button>
      {state && !state.ok ? <p className="text-destructive text-sm sm:col-span-3">{state.error}</p> : null}
    </form>
  );
}
