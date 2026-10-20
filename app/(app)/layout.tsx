import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/button";
import { Inbox } from "@/components/customerio/inbox";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AcmeLogo } from "@/components/logo";
import { isDemo } from "@/lib/demo";
import { ownerAccessFor } from "@/lib/owner-server";
import { getSession } from "@/lib/session";

import { DemoBanner } from "../demo/demo-banner";
import { signOutAction } from "./actions";
import { AppNav } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const isOwner = ownerAccessFor(session) === "owner";

  return (
    <div className="flex min-h-dvh flex-col">
      {isDemo() ? <DemoBanner /> : null}
      <header className="sticky top-0 z-10 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-1 px-2 py-1.5 sm:gap-6 sm:px-6">
          <Link
            href="/dashboard"
            aria-label="Acme dashboard"
            className="inline-flex min-h-11 items-center rounded-lg px-2"
          >
            <AcmeLogo compact />
          </Link>
          <AppNav showStatus={isOwner} />
          <div className="ms-auto flex items-center gap-1">
            <ThemeSwitcher />
            <Inbox />
            <form action={signOutAction}>
              {/* An icon on phones, so the header fits at 375px. */}
              <Button
                type="submit"
                variant="quiet"
                aria-label="Sign out"
                className="size-11 px-0 sm:size-auto sm:px-3"
              >
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="size-5 sm:hidden"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 4.25H5.25a1.5 1.5 0 0 0-1.5 1.5v8.5a1.5 1.5 0 0 0 1.5 1.5H8M12 13.5 15.5 10 12 6.5M15.25 10H8" />
                </svg>
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-5 pt-10 pb-20 sm:px-8 sm:pt-16">
        {children}
      </main>
    </div>
  );
}
