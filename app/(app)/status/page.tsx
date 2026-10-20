import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SdkLiveStatus } from "@/components/customerio/sdk-status";
import { EmailSetup } from "@/components/email/email-setup";
import { SignupTrace } from "@/components/signup-trace";
import { browserSdkState } from "@/lib/customerio/browser";
import { describeEnv, getCustomerioConfig, type EnvVarSource } from "@/lib/customerio/config";
import { links, workspaceUrl } from "@/lib/links";
import { loadReadiness } from "@/lib/readiness-server";
import { getSession } from "@/lib/session";
import { loadSignup } from "@/lib/signup-server";

export const metadata: Metadata = { title: "Status" };

const SOURCES: { source: EnvVarSource; title: string }[] = [
  { source: "customerio", title: "Customer.io integration" },
  { source: "neon", title: "Neon integration" },
  { source: "you", title: "You" },
];

const dateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function Section({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="rounded-2xl bg-surface shadow-raised">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-4 sm:px-6">
        <h2 id={id} className="font-medium">
          {title}
        </h2>
        {aside ? <div className="text-sm text-muted">{aside}</div> : null}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

export default async function StatusPage() {
  const session = await getSession();
  const user = session!.user;
  const config = getCustomerioConfig();
  const [readiness, signup] = await Promise.all([loadReadiness(), loadSignup(user.id)]);
  const sdk = browserSdkState(config);
  const env = describeEnv();

  const emailSummary = {
    ready: { label: "Ready", tone: "text-ok" },
    blocked: { label: "Not ready", tone: "text-wait" },
    no_app_key: { label: "Off here", tone: "text-faint" },
    unknown: { label: "Not checked yet", tone: "text-muted" },
  }[readiness.kind];

  return (
    <>
      <h1 className="font-display-tight text-title font-semibold">Status</h1>
      <p className="mt-2 max-w-prose text-muted">
        How Acme is connected to Customer.io, and what was sent when you signed up. Values stay on
        the server; this page only shows whether each one is set.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line shadow-raised sm:grid-cols-4">
        {[
          { term: "Email", value: <span className={emailSummary.tone}>{emailSummary.label}</span> },
          {
            term: "Browser SDK",
            value: sdk.enabled ? (
              <span className="text-ok">On</span>
            ) : (
              <span className="text-faint">Off</span>
            ),
          },
          { term: "Region", value: config.region === "eu" ? "EU" : "US" },
          {
            term: "Workspace",
            value: config.workspaceId ? (
              <a href={workspaceUrl(config.workspaceId)} className="link tabular-nums">
                {config.workspaceId}
              </a>
            ) : (
              <span className="text-faint">Not set</span>
            ),
          },
        ].map((item) => (
          <div key={item.term} className="bg-surface px-5 py-4">
            <dt className="text-sm text-muted">{item.term}</dt>
            <dd className="mt-1 font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>

      {config.problems.length > 0 ? (
        <ul className="mt-6 grid gap-2 rounded-2xl bg-wait-surface px-5 py-4 text-sm leading-6 shadow-raised">
          {config.problems.map((problem) => (
            <li key={problem.variable}>
              <code className="font-medium text-wait">{problem.variable}</code> {problem.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          {readiness.kind === "blocked" || readiness.kind === "no_app_key" ? (
            <EmailSetup
              readiness={readiness}
              config={config}
              audience="owner"
              signedInEmail={user.email ?? null}
            />
          ) : (
            <Section id="email" title="Email">
              {readiness.kind === "ready" ? (
                <p className="text-sm leading-6 text-muted">
                  <span className="font-medium text-ok">Email works.</span> The last send went
                  through on{" "}
                  <time dateTime={readiness.checkedAt.toISOString()}>
                    {dateFormat.format(readiness.checkedAt)} UTC
                  </time>
                  .
                </p>
              ) : (
                <p className="text-sm leading-6 text-muted">
                  Nothing has been sent yet. The next sign-in link will tell us whether this
                  workspace can send.
                </p>
              )}
            </Section>
          )}

          <Section
            id="trace"
            title="Your signup"
            aside={
              <span className="font-mono text-[0.8125rem]" title={user.id}>
                id {user.id.slice(0, 8)}…
              </span>
            }
          >
            <SignupTrace
              steps={signup?.steps}
              region={config.region}
              signedUpAt={signup?.signedUpAt ?? null}
              emailReady={readiness.kind === "ready"}
            />
          </Section>
        </div>

        <div className="grid gap-6">
          <Section id="sdk" title="Browser SDK">
            {sdk.enabled ? (
              <SdkLiveStatus />
            ) : (
              <div className="text-sm leading-6 text-muted">
                <p className="font-medium text-ink">Off</p>
                {sdk.reason === "no_write_key_eu" ? (
                  <p className="mt-1">
                    The Customer.io integration doesn’t add a browser key for EU workspaces yet.
                    Server events and email work as usual; page views and in-app messages wait for
                    the key.
                  </p>
                ) : (
                  <p className="mt-1">
                    <code className="text-ink">CUSTOMERIO_CDP_WRITE_KEY</code> isn’t set. Run{" "}
                    <code className="text-ink">vercel env pull</code> for local dev, or{" "}
                    <a href={links.dataPipelines} className="link">
                      set up a JavaScript source
                    </a>{" "}
                    in Customer.io and add its write key.
                  </p>
                )}
              </div>
            )}
          </Section>

          <Section id="env" title="Environment variables">
            <div className="grid gap-6">
              {SOURCES.map(({ source, title }) => (
                <div key={source}>
                  <h3 className="text-sm font-medium text-muted">
                    Written by {title === "You" ? "you" : `the ${title}`}
                  </h3>
                  <ul className="mt-2">
                    {env
                      .filter((row) => row.info.setBy === source)
                      .map(({ info, isSet }) => (
                        <li
                          key={info.name}
                          className="flex items-baseline justify-between gap-3 border-t border-line py-2.5 first:border-t-0"
                        >
                          <code className="min-w-0 text-[0.8125rem] break-all" title={info.purpose}>
                            {info.name}
                          </code>
                          <span className={`shrink-0 text-sm ${isSet ? "text-ok" : "text-faint"}`}>
                            {isSet ? "Set" : info.optional ? "Optional" : "Not set"}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
