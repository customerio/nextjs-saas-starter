import type { Metadata } from "next";
import Link from "next/link";

import { loadReadiness } from "@/lib/readiness-server";
import { ownerAccessFor } from "@/lib/owner-server";
import { getSession } from "@/lib/session";
import { loadSignup } from "@/lib/signup-server";

export const metadata: Metadata = { title: "Overview" };

/** "Welcome" for the first few minutes after signup, "Welcome back" after that. */
function signedUpRecently(signedUpAt: Date | null): boolean {
  return signedUpAt !== null && new Date().getTime() - signedUpAt.getTime() < 10 * 60_000;
}

export default async function DashboardPage() {
  const session = await getSession();
  const user = session!.user;
  const isOwner = ownerAccessFor(session) === "owner";
  const [signup, readiness] = await Promise.all([
    loadSignup(user.id),
    isOwner ? loadReadiness() : Promise.resolve(null),
  ]);
  const emailBlocked = readiness?.kind === "blocked" || readiness?.kind === "no_app_key";

  return (
    <>
      <h1 className="text-title font-semibold">
        {signedUpRecently(signup?.signedUpAt ?? null) ? "Welcome to Acme" : "Welcome back"}
      </h1>
      <p className="mt-1.5 text-muted">{user.email}</p>

      {emailBlocked ? (
        <p className="mt-6 flex items-start gap-2 text-sm leading-6 text-muted">
          <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
          <span>
            Email isn’t sending yet.{" "}
            <Link href="/status" className="link">
              Finish setup
            </Link>
          </span>
        </p>
      ) : null}

      <section aria-labelledby="projects" className="mt-12">
        <h2 id="projects" className="font-medium">
          Projects
        </h2>
        <div className="mt-4 flex flex-col items-center rounded-2xl bg-surface px-6 py-16 text-center shadow-raised">
          <ProjectsMark />
          <p className="mt-5 font-medium">No projects yet</p>
          <p className="mt-1 max-w-[20rem] text-sm leading-6 text-muted">
            Your projects will show up here once you create one.
          </p>
        </div>
      </section>
    </>
  );
}

function ProjectsMark() {
  return (
    <span aria-hidden="true" className="grid grid-cols-2 gap-1.5">
      <span className="size-4 rounded-[5px] bg-sunken" />
      <span className="size-4 rounded-[5px] bg-sunken" />
      <span className="size-4 rounded-[5px] bg-sunken" />
      <span className="size-4 rounded-[5px] shadow-[inset_0_0_0_1.5px_var(--line-strong)]" />
    </span>
  );
}
