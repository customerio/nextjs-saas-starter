"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/status", label: "Status" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {ITEMS.map((item) => {
        const current = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className="relative inline-flex min-h-11 items-center rounded-[10px] px-3 text-[0.9375rem] text-muted transition-[background-color,color] duration-150 ease-out hover:bg-sunken hover:text-ink aria-[current=page]:text-ink aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:-bottom-1.5 aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-accent"
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
