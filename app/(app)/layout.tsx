import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/button";
import { Inbox } from "@/components/customerio/inbox";
import { AcmeLogo } from "@/components/logo";
import { ownerAccessFor } from "@/lib/owner-server";
import { getSession } from "@/lib/session";

import { signOutAction } from "./actions";
import { AppNav } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const isOwner = ownerAccessFor(session) === "owner";

  return (
    <div className="flex min-h-dvh flex-col">
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
            <Inbox />
            <form action={signOutAction}>
              <Button type="submit" variant="quiet">
                Sign out
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
