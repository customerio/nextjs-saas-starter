import type { Metadata } from "next";
import Link from "next/link";

import { Rail, type RailStep } from "@/components/rail";
import { readStep, stepView } from "@/components/signup-trace";
import { getSession } from "@/lib/session";
import { loadReadiness } from "@/lib/readiness-server";
import { loadSignup } from "@/lib/signup-server";

export const metadata: Metadata = { title: "Overview" };

const READINESS_LINE = {
  ready: "Email works.",
  blocked: "Email isn’t sending yet. See what’s left.",
  no_app_key: "Email is off in this environment.",
  unknown: "Email hasn’t been checked yet.",
} as const;

/** "Welcome" for the first few minutes after signup, "Welcome back" after that. */
function signedUpRecently(signedUpAt: Date | null): boolean {
  return signedUpAt !== null && new Date().getTime() - signedUpAt.getTime() < 10 * 60_000;
}

export default async function DashboardPage() {
  const session = await getSession();
  const user = session!.user;
  const [signup, readiness] = await Promise.all([loadSignup(user.id), loadReadiness()]);

  const welcome = stepView(readStep(signup?.steps, "welcome_email"), readiness.kind === "ready");
  const isNew = signedUpRecently(signup?.signedUpAt ?? null);

  const gettingStarted: RailStep[] = [
    { key: "account", title: "Create your account", label: "Done", state: "done" },
    {
      key: "welcome",
      title: "Get your welcome email",
      label: welcome.label,
      state: welcome.state,
      children:
        welcome.state === "done" ? undefined : welcome.state === "current" ? (
          <p>
            It goes out once email is set up.{" "}
            <Link href="/status" className="link">
              See what’s left
            </Link>
          </p>
        ) : welcome.state === "pending" ? (
          <p>On its way. Refresh in a moment.</p>
        ) : (
          <p>
            <Link href="/status" className="link">
              See why on the status page
            </Link>
          </p>
        ),
    },
    {
      key: "yours",
      title: "Make Acme yours",
      state: "neutral",
      children: (
        <p>
          Rename it in <code className="text-ink">lib/site.ts</code> and swap the mark in{" "}
          <code className="text-ink">components/logo.tsx</code>.
        </p>
      ),
    },
  ];

  return (
    <>
      <h1 className="font-display-tight text-title font-semibold">
        {isNew ? "Welcome to Acme" : "Welcome back"}
      </h1>
      <p className="mt-2 text-muted">
        Signed in as <span className="text-ink">{user.email}</span>
      </p>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="projects" className="rounded-2xl bg-surface shadow-raised">
          <div className="flex items-baseline justify-between border-b border-line px-5 py-4 sm:px-6">
            <h2 id="projects" className="font-medium">
              Projects
            </h2>
            <span className="text-sm text-faint tabular-nums">0</span>
          </div>
          <div className="px-5 py-14 text-center sm:px-6">
            <ProjectsMark />
            <p className="mt-4 font-medium">No projects yet</p>
            <p className="mx-auto mt-1 max-w-[22rem] text-sm leading-6 text-muted">
              This is where your product goes. Start building it in{" "}
              <code className="text-ink">app/(app)/dashboard/page.tsx</code>.
            </p>
          </div>
        </section>

        <div className="grid gap-6">
          <section
            aria-labelledby="start"
            className="rounded-2xl bg-surface p-5 shadow-raised sm:p-6"
          >
            <h2 id="start" className="mb-5 font-medium">
              Getting started
            </h2>
            <Rail steps={gettingStarted} />
          </section>

          <Link
            href="/status"
            className="group flex items-center justify-between gap-4 rounded-2xl bg-surface px-5 py-4 shadow-raised transition-shadow duration-150 ease-out hover:shadow-overlay sm:px-6"
          >
            <span>
              <span className="block font-medium">Status</span>
              <span className="mt-0.5 block text-sm text-muted">
                {READINESS_LINE[readiness.kind]}
              </span>
            </span>
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="size-4 shrink-0 text-faint transition-colors group-hover:text-ink"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="m6 3.5 4.5 4.5L6 12.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </>
  );
}

function ProjectsMark() {
  return (
    <span aria-hidden="true" className="mx-auto grid w-fit grid-cols-2 gap-1.5">
      <span className="size-5 rounded-md bg-sunken" />
      <span className="size-5 rounded-md bg-sunken" />
      <span className="size-5 rounded-md bg-sunken" />
      <span className="size-5 rounded-md shadow-[inset_0_0_0_1.5px_var(--line-strong)]" />
    </span>
  );
}
