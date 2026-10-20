import Link from "next/link";
import type { ReactNode } from "react";

import { links } from "@/lib/links";
import { site } from "@/lib/site";

import { AcmeLogo } from "./logo";

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
      className="inline-flex min-h-11 items-center text-sm text-faint transition-colors duration-150 hover:text-ink"
    >
      Powered by Customer.io
    </a>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-line py-6 text-sm text-faint">
        <p>
          Acme is a placeholder. Make it yours in <code>lib/site.ts</code>.
        </p>
        <PoweredBy />
      </div>
    </footer>
  );
}
