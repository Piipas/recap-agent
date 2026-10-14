"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveGroqKeyAction } from "./actions";

export function GroqKeyForm({ hasKey }: { hasKey: boolean }) {
  const [state, formAction, pending] = useActionState(saveGroqKeyAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      if (state.message) toast.success(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-2">
      <Label htmlFor="apiKey">{hasKey ? "Replace API key" : "Groq API key"}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id="apiKey" name="apiKey" type="password" autoComplete="off" placeholder="gsk_…" required />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {hasKey ? "Replace" : "Save key"}
        </Button>
      </div>
      {state && !state.ok ? <p className="text-destructive text-sm">{state.error}</p> : null}
    </form>
  );
}
