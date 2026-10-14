"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setScheduleEnabledAction } from "./actions";

export function EnabledSwitch({ scheduleId, enabled, label }: { scheduleId: string; enabled: boolean; label: string }) {
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      aria-label={label}
      checked={optimistic}
      disabled={pending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          setOptimistic(checked);
          const result = await setScheduleEnabledAction(scheduleId, checked);
          if (result.ok) {
            if (result.message) toast.success(result.message);
          } else {
            toast.error(result.error);
          }
        })
      }
    />
  );
}
