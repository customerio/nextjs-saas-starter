import type { Metadata } from "next";
import Link from "next/link";

import { browserSdkState } from "@/lib/customerio/browser";
import { getCustomerioConfig } from "@/lib/customerio/config";
import { getDb } from "@/lib/db";
import {
  listProjects,
  readOnboarding,
  type OnboardingRow,
  type ProjectRow,
} from "@/lib/db/app-store";
import { checklistView } from "@/lib/flows/onboarding";
import { ownerAccessFor } from "@/lib/owner-server";
import { loadReadiness } from "@/lib/readiness-server";
import { getSession } from "@/lib/session";
import { loadSignup } from "@/lib/signup-server";
import { capitalize, site } from "@/lib/site";

import { GetStarted } from "./get-started";
import { ProjectList } from "./project-list";

export const metadata: Metadata = { title: "Overview" };

/** "Welcome" for the first few minutes after signup, "Welcome back" after that. */
function signedUpRecently(signedUpAt: Date | null): boolean {
  return signedUpAt !== null && new Date().getTime() - signedUpAt.getTime() < 10 * 60_000;
}

async function loadAppData(
  userId: string,
): Promise<{ ok: true; projects: ProjectRow[]; onboarding: OnboardingRow | null } | { ok: false }> {
  try {
    const db = getDb();
    const [projects, onboarding] = await Promise.all([
      listProjects(db, userId),
      readOnboarding(db, userId),
    ]);
    return { ok: true, projects, onboarding };
  } catch (error) {
    console.error("[dashboard] could not load data:", error);
    return { ok: false };
  }
}

export default async function DashboardPage() {
  const session = await getSession();
  const user = session!.user;
  const isOwner = ownerAccessFor(session) === "owner";
  const inboxAvailable = browserSdkState(getCustomerioConfig()).enabled;
  const { singular, plural } = site.resource;

  const [signup, readiness, data] = await Promise.all([
    loadSignup(user.id),
    isOwner ? loadReadiness() : Promise.resolve(null),
    loadAppData(user.id),
  ]);
  const emailBlocked = readiness?.kind === "blocked" || readiness?.kind === "no_app_key";
  const checklist = data.ok
    ? checklistView(data.onboarding, { hasProjects: data.projects.length > 0, inboxAvailable })
    : null;

  return (
    <>
      <h1 className="text-title font-semibold">
        {signedUpRecently(signup?.signedUpAt ?? null) ? `Welcome to ${site.name}` : "Welcome back"}
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

      {/*
        In-app messages: a message you send from Customer.io with position
        "Inline" and element ID `dashboard-message` renders here. The slot takes
        no space until a message arrives. Modal and banner messages need no slot.
      */}
      <div id="dashboard-message" className="mt-8 empty:hidden" />

      <div className="mt-8 grid gap-10">
        {checklist && !checklist.dismissed ? (
          <GetStarted
            steps={checklist.steps}
            doneCount={checklist.doneCount}
            total={checklist.total}
            complete={checklist.complete}
            inboxAvailable={inboxAvailable}
            singular={singular}
          />
        ) : null}

        {data.ok ? (
          <ProjectList
            singular={singular}
            plural={plural}
            projects={data.projects.map((project) => ({
              id: project.id,
              name: project.name,
              createdAt: project.createdAt.toISOString(),
            }))}
          />
        ) : (
          <section
            aria-labelledby="projects-error"
            className="rounded-2xl bg-surface px-6 py-12 text-center shadow-raised"
          >
            <h2 id="projects-error" className="font-medium">
              {capitalize(plural)} didn’t load
            </h2>
            <p className="mx-auto mt-1 max-w-[24rem] text-sm leading-6 text-muted">
              Refresh the page in a moment.
              {process.env.NODE_ENV === "development" ? (
                <>
                  {" "}
                  In local dev, run <code className="text-ink">pnpm db:migrate</code> first.
                </>
              ) : null}
            </p>
          </section>
        )}
      </div>
    </>
  );
}
