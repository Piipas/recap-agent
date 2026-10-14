"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/recaps", label: "Recaps" },
  { href: "/schedules", label: "Schedules" },
  { href: "/managers", label: "Managers" },
  { href: "/connections", label: "Connections" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 flex items-center gap-1 overflow-x-auto text-sm">
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 whitespace-nowrap transition-colors",
              active ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
