import type { RecapStatus, RunStatus } from "@recap/db";
import { Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const recapLabels: Record<RecapStatus, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> =
  {
    DRAFT: { label: "Draft", variant: "outline" },
    PENDING_CONFIRMATION: { label: "Awaiting confirmation", variant: "default" },
    SENT: { label: "Sent", variant: "secondary" },
    FAILED: { label: "Send failed", variant: "destructive" },
  };

export function RecapStatusBadge({ status }: { status: RecapStatus }) {
  const { label, variant } = recapLabels[status];
  return <Badge variant={variant}>{label}</Badge>;
}

/** Status of a generation run, or of its recap once one exists. */
export function RunStatusBadge({ runStatus, recapStatus }: { runStatus: RunStatus; recapStatus?: RecapStatus }) {
  if (recapStatus) return <RecapStatusBadge status={recapStatus} />;

  switch (runStatus) {
    case "QUEUED":
      return (
        <Badge variant="outline" className="gap-1">
          <Clock /> Queued
        </Badge>
      );
    case "RUNNING":
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="animate-spin" /> Generating
        </Badge>
      );
    case "FAILED":
      return <Badge variant="destructive">Generation failed</Badge>;
    case "SUCCEEDED":
      return <Badge variant="outline">No commits</Badge>;
  }
}
