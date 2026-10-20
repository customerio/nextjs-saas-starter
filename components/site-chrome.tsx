import Link from "next/link";
import type { ReactNode } from "react";

import { links } from "@/lib/links";
import { site } from "@/lib/site";

import { AcmeLogo, AcmeMark } from "./logo";

export function MarketingHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
      <Link
        href="/"
        className="-mx-2 inline-flex min-h-11 items-center rounded-lg px-2"
        aria-label={`${site.name} home`}
      >
        <AcmeLogo />
      </Link>
      {children ? (
        <nav aria-label="Account" className="flex items-center gap-1">
          {children}
        </nav>
      ) : null}
    </header>
  );
}

/** The one place Customer.io's name appears on Acme's own pages. */
export function PoweredBy() {
  return (
    <a
      href={links.customerio}
      className="inline-flex min-h-11 items-center text-[0.8125rem] text-faint transition-colors duration-150 hover:text-ink"
    >
      Powered by Customer.io
    </a>
  );
}

/**
 * The frame for sign-in and "check your email": one centered column, the
 * mark on top, and nothing else on the page.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-5">
      <main id="main" className="flex flex-1 flex-col items-center justify-center py-16">
        <div className="w-full max-w-[22.5rem]">
          <Link
            href="/"
            aria-label={`${site.name} home`}
            className="-m-1.5 inline-flex rounded-xl p-1.5"
          >
            <AcmeMark className="size-9" />
          </Link>
          {children}
        </div>
      </main>
      <footer className="flex justify-center pb-4">
        <PoweredBy />
      </footer>
    </div>
  );
}
