import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/button";
import { Inbox } from "@/components/customerio/inbox";
import { AcmeMark } from "@/components/logo";
import { PoweredBy } from "@/components/site-chrome";
import { getSession } from "@/lib/session";

import { signOutAction } from "./actions";
import { AppNav } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-1.5 sm:gap-4 sm:px-6">
          <Link
            href="/dashboard"
            aria-label="Acme dashboard"
            className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
          >
            <AcmeMark className="size-6" />
          </Link>
          <AppNav />
          <div className="ms-auto flex items-center gap-1">
            <Inbox />
            <span
              className="hidden max-w-[14rem] truncate px-2 text-sm text-muted md:inline"
              title={session.user.email ?? undefined}
            >
              {session.user.email}
            </span>
            <form action={signOutAction}>
              <Button type="submit" variant="quiet">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 pt-8 pb-20 sm:px-8 sm:pt-12">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="flex justify-end border-t border-line py-3">
          <PoweredBy />
        </div>
      </footer>
    </div>
  );
}
