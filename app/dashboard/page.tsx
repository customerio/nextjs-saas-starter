import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { authSetup } from "@/auth";
import { Button } from "@/components/button";
import { SiteHeader } from "@/components/site-header";
import { SignupTrace } from "@/components/signup-trace";
import {
  getCustomerioConfig,
  isEmailSetupFailure,
  isTemporaryFailure,
  SIGNED_UP_EVENT,
} from "@/lib/customerio";
import { links } from "@/lib/links";
import { getSession } from "@/lib/session";
import { readSignupRecord } from "@/lib/signup-record";

import { retryWelcomeEmail, signOutAction } from "./actions";
import { ConnectionPanel } from "./connection-panel";
import { EmailSetup } from "./email-setup";
import { reportSteps } from "./report-steps";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Dashboard" };

const timeFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const linkClass =
  "font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const { user } = session;

  const config = getCustomerioConfig();
  const record = await readSignupRecord(user.id);
  const email = record?.report.email;
  const { demo, github } = authSetup();

  // What, if anything, stops the welcome email, so we can show the right help.
  const setupBlock =
    email?.status === "failed" && isEmailSetupFailure(email.failure)
      ? email.failure.kind
      : email?.status === "skipped" && email.reason === "missing_from_email"
        ? "missing_from_email"
        : null;
  // Offer a retry only when it can work: a temporary failure, or a missing
  // setting that is now present.
  const canRetry =
    !setupBlock &&
    ((email?.status === "failed" && isTemporaryFailure(email.failure)) ||
      (email?.status === "skipped" && email.reason === "missing_app_key" && !!config.appApiKey));
  const nothingSent =
    record !== null && Object.values(record.report).every((step) => step.status === "skipped");

  const firstName = user.name?.split(" ")[0];

  return (
    <>
      <SiteHeader>
        <span
          className="hidden max-w-[16rem] truncate text-sm text-muted sm:inline"
          title={user.email ?? undefined}
        >
          {user.email}
        </span>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </SiteHeader>

      <main id="main" className="mx-auto w-full max-w-6xl px-5 pt-6 pb-24 sm:px-8 sm:pt-12">
        <h1 className="font-display-wide text-title font-semibold">
          {firstName ? `Welcome, ${firstName}.` : "Welcome."}
        </h1>
        <p className="mt-3 max-w-prose leading-7 text-muted">
          {record ? (
            <>
              {nothingSent
                ? "Customer.io is not connected here, so nothing was sent when you signed up on "
                : "Here is what this app sent to Customer.io when you signed up on "}
              <time dateTime={record.signedUpAt}>
                {timeFormat.format(new Date(record.signedUpAt))} UTC
              </time>
              .
            </>
          ) : (
            <>
              This browser has no record of your signup, so here is what the app sends for a new
              person. It keeps the record in a cookie, because the starter has no database.
            </>
          )}
        </p>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="grid gap-6 lg:col-start-1">
            <SignupTrace
              title="Your signup in Customer.io"
              aside={
                <span className="font-mono text-[0.8125rem]">
                  id <span className="text-ink">{user.id}</span>
                </span>
              }
              steps={reportSteps(record?.report ?? null, record?.region ?? config.region)}
              footer={
                canRetry ? (
                  <form action={retryWelcomeEmail}>
                    <RetryButton />
                  </form>
                ) : undefined
              }
            />

            {setupBlock ? <EmailSetup blockedBy={setupBlock} /> : null}
          </div>

          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <ConnectionPanel config={config} />
          </div>

          <section aria-labelledby="next" className="px-1 pt-4 lg:col-start-1">
            <h2 id="next" className="font-display-wide text-xl font-semibold">
              Next steps
            </h2>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2">
              <li>
                <h3 className="font-medium">Build a welcome campaign</h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  In Customer.io, create a campaign that starts when a person performs{" "}
                  <code className="font-mono text-[0.8125rem] text-ink">{SIGNED_UP_EVENT}</code>.{" "}
                  <a href={links.campaigns} className={linkClass}>
                    Campaigns
                  </a>
                </p>
              </li>
              <li>
                <h3 className="font-medium">Get told about each signup</h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Add an email to that campaign that goes to your own address. You hear about your
                  first signup the moment it happens.
                </p>
              </li>
              {demo ? (
                <li>
                  <h3 className="font-medium">
                    {github ? "Turn off demo sign-in" : "Replace demo sign-in"}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {github ? (
                      <>
                        Remove{" "}
                        <code className="font-mono text-[0.8125rem] text-ink">
                          AUTH_DEMO_SIGN_IN
                        </code>{" "}
                        so only GitHub sign-in is left.
                      </>
                    ) : (
                      <>
                        Add{" "}
                        <code className="font-mono text-[0.8125rem] text-ink">AUTH_GITHUB_ID</code>{" "}
                        and{" "}
                        <code className="font-mono text-[0.8125rem] text-ink">
                          AUTH_GITHUB_SECRET
                        </code>
                        . Demo sign-in then turns off by itself.{" "}
                        <a href={links.githubOAuthApp} className={linkClass}>
                          New OAuth app
                        </a>
                      </>
                    )}
                  </p>
                </li>
              ) : null}
              <li>
                <h3 className="font-medium">Make it yours</h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Start in{" "}
                  <code className="font-mono text-[0.8125rem] text-ink">
                    lib/customerio/signup.ts
                  </code>
                  . Every Customer.io call in this app lives there.
                </p>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
