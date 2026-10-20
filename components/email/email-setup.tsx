import { Rail, type RailState, type RailStep } from "@/components/rail";
import type { CustomerioConfig } from "@/lib/customerio/config";
import {
  setupChecklist,
  type Readiness,
  type SetupStepId,
  type SetupStepState,
} from "@/lib/customerio/readiness";
import { links, workspaceUrl } from "@/lib/links";

import { CheckAgain } from "./check-again";

const RAIL: Record<SetupStepState, RailState> = {
  done: "done",
  current: "current",
  waiting: "waiting",
  unknown: "neutral",
};

const LABEL: Record<SetupStepState, string | undefined> = {
  done: "Done",
  current: "Next step",
  waiting: undefined,
  unknown: undefined,
};

function stepCopy(id: SetupStepId, config: CustomerioConfig, readiness: Readiness) {
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
  }
}

/**
 * What stops email from sending, as an ordered checklist, plus "Check again".
 * Renders nothing once email works.
 */
export function EmailSetup({
  readiness,
  config,
  audience,
  signedInEmail,
}: {
  readiness: Readiness;
  config: CustomerioConfig;
  /** "visitor" on the sign-in page, "owner" on the status page. */
  audience: "visitor" | "owner";
  signedInEmail: string | null;
}) {
  if (readiness.kind === "ready" || readiness.kind === "unknown") return null;

  const headingId = `email-setup-${audience}`;

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
          integration adds it to Production and Preview only.
          {audience === "visitor"
            ? " Running locally? Your sign-in link prints in the terminal that runs pnpm dev."
            : " In local dev, sign-in links print in the terminal instead."}
        </p>
      </section>
    );
  }

  const recipient = config.ownerEmail ?? signedInEmail;
  const recipientHint = recipient
    ? `Sends one test email to ${recipient}. It only arrives once email works.`
    : "Set OWNER_EMAIL to check with a test email. Each sign-in link request also checks.";

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

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-2xl bg-surface shadow-raised"
    >
      <div className="border-b border-line bg-wait-surface px-5 py-4 sm:px-6">
        <h2 id={headingId} className="flex items-center gap-2 font-medium">
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="size-4 shrink-0 text-wait"
            fill="currentColor"
          >
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm.75 3.25v3.69l2.28 2.28-1.06 1.06-2.72-2.72V4.75h1.5Z" />
          </svg>
          {audience === "visitor" ? "Sign-in emails can’t go out yet" : "Email isn’t sending yet"}
        </h2>
        <p className="mt-1 max-w-prose text-sm leading-6 text-muted">
          {audience === "visitor"
            ? "This site is new and its email setup isn’t finished. You can still ask for a link; we’ll save your email."
            : "New Customer.io workspaces start this way. Sign-ups are still recorded. Finish these steps and email starts on its own."}
        </p>
      </div>

      <div className="px-5 py-5 sm:px-6">
        {readiness.reason === "delivery_disabled" ? (
          <p className="max-w-prose text-sm leading-6 text-muted">
            The workspace is set to <span className="font-medium text-ink">Do Not Send</span>. Turn
            sending back on in your workspace settings.{" "}
            <a href={workspaceUrl(config.workspaceId)} className="link">
              Open Customer.io
            </a>
          </p>
        ) : (
          <Rail steps={steps} numbered />
        )}
      </div>

      <div className="border-t border-line px-5 py-4 sm:px-6">
        <CheckAgain recipientHint={recipientHint} />
      </div>
    </section>
  );
}
