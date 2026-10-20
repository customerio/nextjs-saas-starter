import { Rail, type RailState, type RailStep } from "@/components/rail";
import type { CustomerioConfig } from "@/lib/customerio/config";
import {
  setupChecklist,
  type ChecklistStepId,
  type Readiness,
  type SetupStepState,
} from "@/lib/customerio/readiness";
import { isDemo } from "@/lib/demo";
import { links, workspaceUrl } from "@/lib/links";

import { CheckAgain } from "./check-again";

const RAIL: Record<SetupStepState, RailState> = {
  done: "done",
  current: "current",
  waiting: "waiting",
  unknown: "neutral",
  cant_check: "neutral",
};

const LABEL: Record<SetupStepState, string | undefined> = {
  done: "Done",
  current: "Next step",
  waiting: undefined,
  unknown: undefined,
  cant_check: "Can’t check from here",
};

function stepCopy(id: ChecklistStepId, config: CustomerioConfig, readiness: Readiness) {
  switch (id) {
    case "confirm_owner_email":
      return {
        title: "Confirm the account owner’s email",
        body: "Customer.io sent a confirmation link to the account owner when the account was made. Open it, or sign in to Customer.io to get a new one.",
        href: workspaceUrl(config.workspaceId),
        linkLabel: "Open Customer.io",
      };
    case "account_approval":
      return {
        title: "Get the account approved for sending",
        body: "Customer.io reviews new accounts before they can send email. Fill in your account details to start the review.",
        href: links.accountApproval,
        linkLabel: "How approval works",
      };
    case "sending_domain":
      return {
        title: "Verify a sending domain",
        body: (
          <>
            Add the DNS records Customer.io gives you for your domain.
            {readiness.kind === "blocked" && readiness.reason === "from_domain_unverified" ? (
              <>
                {" "}
                The domain in <code className="text-ink">CUSTOMERIO_FROM_EMAIL</code> is not
                verified yet.
              </>
            ) : (
              <>
                {" "}
                Emails then come from that domain. To pick the exact address, set{" "}
                <code className="text-ink">CUSTOMERIO_FROM_EMAIL</code>.
              </>
            )}
          </>
        ),
        href: links.sendingDomains,
        linkLabel: "Verify a domain",
      };
    case "test_mode":
      return {
        title: "Turn off test mode",
        body: (
          <>
            New workspaces start in test mode, so emails only reach you. Turn it off in Customer.io
            when you’re ready to email real people: workspace{" "}
            <span className="text-ink">Settings</span>, then{" "}
            <span className="text-ink">Send messages normally</span>.
          </>
        ),
        href: links.testMode,
        linkLabel: "About test mode",
      };
  }
}

function IfEmailsDontArrive({ workspaceId }: { workspaceId: string | null }) {
  return (
    <div className="border-t border-line px-5 py-4 text-sm leading-6 text-muted sm:px-6">
      <h3 className="font-medium text-ink">If emails don’t arrive</h3>
      <p className="mt-0.5 max-w-prose">
        Customer.io can accept an email and still not deliver it: test mode, the daily limit for new
        accounts, a content check, or your plan’s monthly limit or funds. The app can’t see these.
        Check <span className="text-ink">Deliveries</span> in{" "}
        <a href={workspaceUrl(workspaceId)} className="link">
          your workspace
        </a>{" "}
        to see what happened to each one, or read{" "}
        <a href={links.messagesNotSending} className="link">
          why messages don’t arrive
        </a>
        .
      </p>
    </div>
  );
}

/**
 * Email setup for the owner, on the status page: what stops email, in
 * Customer.io's order, plus test mode, which the app can't see.
 */
export function EmailSetup({
  readiness,
  config,
  signedInEmail,
}: {
  readiness: Readiness;
  config: CustomerioConfig;
  signedInEmail: string | null;
}) {
  if (readiness.kind === "unknown") return null;
  const headingId = "email-setup";

  if (readiness.kind === "no_app_key") {
    return (
      <section
        aria-labelledby={headingId}
        className="rounded-2xl bg-surface p-5 shadow-raised sm:p-6"
      >
        <h2 id={headingId} className="font-medium">
          Email is off in this environment
        </h2>
        <p className="mt-1.5 max-w-prose text-sm leading-6 text-muted">
          <code className="text-ink">CUSTOMERIO_APP_API_KEY</code> is not set here. The Customer.io
          integration adds it to Production and Preview only. In local dev, sign-in links print in
          the terminal instead.
        </p>
      </section>
    );
  }

  const recipient = config.ownerEmail ?? signedInEmail;
  const checkAgain = isDemo() ? (
    <p className="border-t border-line px-5 py-4 text-sm leading-6 text-muted sm:px-6">
      In your own app, <span className="text-ink">Check again</span> sends you one test email. The
      demo sends nothing.
    </p>
  ) : (
    <div className="border-t border-line px-5 py-4 sm:px-6">
      <CheckAgain
        recipientHint={
          recipient
            ? `Sends one test email to ${recipient}. It only arrives once email works.`
            : "Set OWNER_EMAIL to check with a test email. Each sign-in link request also checks."
        }
      />
    </div>
  );

  if (readiness.kind === "suspended") {
    return (
      <section
        aria-labelledby={headingId}
        className="overflow-hidden rounded-2xl bg-surface shadow-raised"
      >
        <div className="bg-wait-surface px-5 py-4 sm:px-6">
          <h2 id={headingId} className="flex items-center gap-2 font-medium">
            <WaitIcon />
            Your Customer.io account isn’t active
          </h2>
          <p className="mt-1 max-w-prose text-sm leading-6 text-muted">
            Customer.io answered “Do Not Send”. That happens when a trial ends, when an account is
            suspended or cancelled, or when the workspace is set to{" "}
            <span className="text-ink">Never send messages</span>. Sign-in still works for you;
            emails wait until the account is active again.
          </p>
          <p className="mt-2 flex flex-wrap gap-x-5 text-sm">
            <a
              href={workspaceUrl(config.workspaceId)}
              className="-my-2 inline-flex min-h-11 items-center link"
            >
              Open Customer.io
            </a>
            <a href={links.billing} className="-my-2 inline-flex min-h-11 items-center link">
              How billing works
            </a>
          </p>
        </div>
        {checkAgain}
      </section>
    );
  }

  const steps: RailStep[] = setupChecklist(readiness).map(({ id, state }) => {
    const copy = stepCopy(id, config, readiness);
    return {
      key: id,
      title: copy.title,
      label: LABEL[state],
      state: RAIL[state],
      children:
        state === "done" ? undefined : (
          <>
            <p className="max-w-prose">{copy.body}</p>
            <a href={copy.href} className="-my-2 inline-flex min-h-11 items-center link">
              {copy.linkLabel}
            </a>
          </>
        ),
    };
  });

  const ready = readiness.kind === "ready";

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-2xl bg-surface shadow-raised"
    >
      <div className={`border-b border-line px-5 py-4 sm:px-6 ${ready ? "" : "bg-wait-surface"}`}>
        <h2 id={headingId} className="flex items-center gap-2 font-medium">
          {ready ? <OkIcon /> : <WaitIcon />}
          {ready ? "Email works" : "Email isn’t sending yet"}
        </h2>
        <p className="mt-1 max-w-prose text-sm leading-6 text-muted">
          {ready
            ? "Customer.io accepted the last email. One thing the app can’t check is below."
            : "New Customer.io workspaces start this way. Sign-ups are still recorded. Finish these steps and email starts on its own."}
        </p>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <Rail steps={steps} numbered />
      </div>

      {ready ? <IfEmailsDontArrive workspaceId={config.workspaceId} /> : checkAgain}
    </section>
  );
}

function WaitIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-4 shrink-0 text-wait"
      fill="currentColor"
    >
      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm.75 3.25v3.69l2.28 2.28-1.06 1.06-2.72-2.72V4.75h1.5Z" />
    </svg>
  );
}

function OkIcon() {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-ok text-surface">
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        className="size-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m2.5 6.2 2.3 2.3L9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
