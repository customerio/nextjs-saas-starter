import type { FailureKind } from "@/lib/customerio";
import { links } from "@/lib/links";

import { RetryButton } from "./retry-button";
import { retryWelcomeEmail } from "./actions";

/**
 * A new Customer.io workspace has to pass these checks before it can send.
 * They are listed in the order Customer.io checks them.
 */
const CHECKS: {
  kinds: FailureKind[];
  title: string;
  body: React.ReactNode;
  href: string;
  linkLabel: string;
}[] = [
  {
    kinds: ["owner_email_unconfirmed"],
    title: "Confirm the account owner’s email",
    body: "Customer.io sent a confirmation link to the account owner when the account was made. Click it, or sign in to Customer.io to get a new one.",
    href: links.app,
    linkLabel: "Open Customer.io",
  },
  {
    kinds: ["account_not_approved"],
    title: "Get the account approved for sending",
    body: "Customer.io reviews new accounts before they can send email. Fill in your account details in Customer.io to start the review.",
    href: links.accountApproval,
    linkLabel: "How approval works",
  },
  {
    kinds: ["no_from_address", "from_domain_unverified"],
    title: "Verify a sending domain",
    body: (
      <>
        Add the DNS records Customer.io gives you for your domain. Then set{" "}
        <code className="font-mono text-[0.8125rem] text-ink">CUSTOMERIO_FROM_EMAIL</code> to an
        address on that domain.
      </>
    ),
    href: links.sendingDomains,
    linkLabel: "Verify a domain",
  },
];

export function EmailSetup({ blockedBy }: { blockedBy: FailureKind | "missing_from_email" }) {
  const blockingKind = blockedBy === "missing_from_email" ? "from_domain_unverified" : blockedBy;

  return (
    <section aria-labelledby="email-setup" className="rounded-xl bg-surface shadow-card">
      <div className="px-5 pt-5 pb-1">
        <h2 id="email-setup" className="font-display-wide text-xl font-semibold">
          Finish setting up email
        </h2>
        <p className="mt-2 max-w-prose leading-7 text-muted">
          Your signup worked. Email waits until your Customer.io workspace is allowed to send. New
          workspaces start this way. Finish these steps, then send the welcome email again.
        </p>
      </div>
      <ol className="px-5 py-3">
        {CHECKS.map((check, index) => {
          const blocking = check.kinds.includes(blockingKind);
          return (
            <li
              key={check.title}
              className="grid grid-cols-[1.75rem_1fr] gap-x-2 border-t border-line py-4 first:border-t-0"
            >
              <span
                aria-hidden="true"
                className={`flex size-6 items-center justify-center rounded-md font-mono text-xs font-medium tabular-nums ${
                  blocking ? "bg-warn text-surface" : "bg-sunken text-muted"
                }`}
              >
                {index + 1}
              </span>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-medium">{check.title}</h3>
                  {blocking ? (
                    <span className="text-sm font-medium text-warn">
                      This is blocking your email
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 max-w-prose text-sm leading-6 text-muted">{check.body}</p>
                <a
                  href={check.href}
                  className="-my-1.5 mt-0.5 inline-flex min-h-11 items-center text-sm font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink"
                >
                  {check.linkLabel}
                </a>
              </div>
            </li>
          );
        })}
      </ol>
      <form action={retryWelcomeEmail} className="border-t border-line px-5 py-4">
        <RetryButton />
      </form>
    </section>
  );
}
