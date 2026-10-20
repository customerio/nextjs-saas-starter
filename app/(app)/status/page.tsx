import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SdkLiveStatus } from "@/components/customerio/sdk-status";
import { EmailSetup } from "@/components/email/email-setup";
import { SignupTrace } from "@/components/signup-trace";
import { browserSdkState } from "@/lib/customerio/browser";
import { describeEnv, getCustomerioConfig, type EnvVarSource } from "@/lib/customerio/config";
import { links, workspaceUrl } from "@/lib/links";
import { ownerAccessFor } from "@/lib/owner-server";
import { loadReadiness } from "@/lib/readiness-server";
import { getSession } from "@/lib/session";
import { loadSignup } from "@/lib/signup-server";

export const metadata: Metadata = { title: "Status" };

const SOURCES: { source: EnvVarSource; title: string }[] = [
  { source: "customerio", title: "From the Customer.io integration" },
  { source: "neon", title: "From the Neon integration" },
  { source: "you", title: "From you" },
];

const dateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export default async function StatusPage() {
  const session = await getSession();
  const user = session!.user;
  const access = ownerAccessFor(session);
  // Setup details are for the owner. Everyone else gets a plain 404.
  if (access === "not_owner") notFound();
  if (access === "no_owner_email") {
    return (
      <div className="max-w-prose">
        <h1 className="text-title font-semibold">Status</h1>
        <p className="mt-3 text-muted">
          This page is only for the owner. Set <code className="text-ink">OWNER_EMAIL</code> to your
          email in the Vercel project, redeploy, and sign in with that address.
        </p>
      </div>
    );
  }

  const config = getCustomerioConfig();
  const [readiness, signup] = await Promise.all([loadReadiness(), loadSignup(user.id)]);
  const sdk = browserSdkState(config);
  const env = describeEnv();

  const email = {
    ready: { label: "Ready", tone: "text-ok" },
    blocked: { label: "Not ready", tone: "text-wait" },
    no_app_key: { label: "Off here", tone: "text-faint" },
    unknown: { label: "Not checked yet", tone: "text-muted" },
  }[readiness.kind];

  const summary = [
    { term: "Email", value: <span className={email.tone}>{email.label}</span> },
    {
      term: "Browser SDK",
      value: sdk.enabled ? <SdkLiveStatus /> : <span className="text-faint">Off</span>,
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
  ];

  return (
    <>
      <h1 className="text-title font-semibold">Status</h1>
      <p className="mt-1.5 max-w-prose text-muted">
        Only you can see this page. It shows which values are set, never the values.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        {summary.map((item) => (
          <div key={item.term}>
            <dt className="text-sm text-muted">{item.term}</dt>
            <dd className="mt-0.5 font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>

      {!sdk.enabled ? (
        <p className="mt-4 max-w-prose text-sm leading-6 text-muted">
          {sdk.reason === "no_write_key_eu" ? (
            "The integration doesn’t add a browser key for EU workspaces yet, so page views, in-app messages, and the inbox are off. Server events and email work as usual."
          ) : (
            <>
              The browser SDK is off because{" "}
              <code className="text-ink">CUSTOMERIO_CDP_WRITE_KEY</code> isn’t set.{" "}
              <a href={links.dataPipelines} className="link">
                Set up a JavaScript source
              </a>
            </>
          )}
        </p>
      ) : null}

      {config.problems.length > 0 ? (
        <ul className="mt-4 grid gap-1 text-sm leading-6">
          {config.problems.map((problem) => (
            <li key={problem.variable} className="text-wait">
              <code className="font-medium">{problem.variable}</code>: {problem.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-10 grid items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid gap-10">
          {readiness.kind === "blocked" || readiness.kind === "no_app_key" ? (
            <EmailSetup readiness={readiness} config={config} signedInEmail={user.email ?? null} />
          ) : (
            <p className="text-muted">
              {readiness.kind === "ready" ? (
                <>
                  <span className="font-medium text-ok">Email works.</span> The last send went
                  through on{" "}
                  <time dateTime={readiness.checkedAt.toISOString()}>
                    {dateFormat.format(readiness.checkedAt)} UTC
                  </time>
                  .
                </>
              ) : (
                "Nothing has been sent yet. The next sign-in link will show whether this workspace can send."
              )}
            </p>
          )}

          <section aria-labelledby="trace">
            <h2 id="trace" className="mb-5 font-medium">
              What was sent when you signed up
            </h2>
            <SignupTrace
              steps={signup?.steps}
              region={config.region}
              signedUpAt={signup?.signedUpAt ?? null}
              emailReady={readiness.kind === "ready"}
            />
          </section>
        </div>

        <section aria-labelledby="env">
          <h2 id="env" className="font-medium">
            Environment variables
          </h2>
          <div className="mt-4 grid gap-6">
            {SOURCES.map(({ source, title }) => (
              <div key={source}>
                <h3 className="text-sm text-muted">{title}</h3>
                <ul className="mt-1">
                  {env
                    .filter((row) => row.info.setBy === source)
                    .map(({ info, isSet }) => (
                      <li
                        key={info.name}
                        className="flex items-baseline justify-between gap-3 border-b border-line py-2"
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
        </section>
      </div>
    </>
  );
}
