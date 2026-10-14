import { NotebookPen } from "lucide-react";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md">
        <NotebookPen className="size-4" />
      </span>
      Recap Agent
    </Link>
  );
}
