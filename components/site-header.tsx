import Link from "next/link";

import { site } from "@/lib/site";

import { CustomerioMark } from "./logo";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
      <Link
        href="/"
        className="-mx-2 inline-flex min-h-11 items-center gap-2.5 rounded-md px-2 font-medium"
      >
        <CustomerioMark className="size-[1.125rem]" />
        <span>{site.name}</span>
      </Link>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </header>
  );
}
