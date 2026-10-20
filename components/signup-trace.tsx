import type { ReactNode } from "react";

import { Rail, type RailState, type RailStep } from "@/components/rail";
import type { CustomerioRegion } from "@/lib/customerio/config";
import { signupEndpoints } from "@/lib/customerio/endpoints";
import { isEmailSetupFailure, type FailureKind } from "@/lib/customerio/errors";
import type { SkipReason, StepRecord } from "@/lib/customerio/steps";

/**
 * What the app sent to Customer.io for one person, read from `signups.steps`.
 * The record comes from our own database, but check its shape anyway: older
 * rows or manual edits should never crash the page.
 */

export type TraceKey =
  | "identify_lead"
  | "signup_started"
  | "identify"
  | "signed_up"
  | "welcome_email"
  | "owner_notification";

const STATUSES = new Set(["done", "skipped", "failed", "pending"]);

export function readStep(
  steps: Record<string, unknown> | undefined,
  key: TraceKey,
): StepRecord | null {
  const value = steps?.[key];
  if (typeof value !== "object" || value === null) return null;
  return STATUSES.has((value as { status?: string }).status ?? "") ? (value as StepRecord) : null;
}

const SKIP_NOTES: Record<SkipReason, ReactNode> = {
  missing_track_keys: (
    <>
      <code className="text-ink">CUSTOMERIO_SITE_ID</code> or{" "}
      <code className="text-ink">CUSTOMERIO_TRACK_API_KEY</code> is not set here.
    </>
  ),
  missing_app_key: (
    <>
      <code className="text-ink">CUSTOMERIO_APP_API_KEY</code> is not set here. The integration adds
      it to Production and Preview only.
    </>
  ),
  no_owner_email: (
    <>
      Set <code className="text-ink">OWNER_EMAIL</code> to get an email for each new signup.
    </>
  ),
  owner_signed_up: "You are the owner, so there was nobody else to tell.",
  identify_failed: "Not sent, because adding the person failed.",
};

const FAILURE_HINTS: Partial<Record<FailureKind, string>> = {
  owner_email_unconfirmed: "Waiting for the account owner to confirm their email.",
  account_not_approved: "Waiting for Customer.io to approve the account for sending.",
  no_from_address: "Waiting for a verified sending domain.",
  from_domain_unverified: "The sender’s domain is not verified yet.",
  delivery_disabled: "The workspace is set to Do Not Send.",
  unauthorized:
    "Customer.io did not accept the key. Check it, and check that CUSTOMERIO_REGION matches.",
  message_not_found: "No transactional message has the ID you set.",
  rate_limited: "Too many requests at once.",
  server_error: "A problem on the Customer.io side.",
  timeout: "Customer.io did not answer in time.",
  network: "Could not reach Customer.io.",
};

/** Lets long URLs wrap after a slash instead of in the middle of a word. */
function BreakableUrl({ url }: { url: string }) {
  const parts = url.split("/");
  return parts.map((part, index) => (
    <span key={index}>
      {part}
      {index < parts.length - 1 ? (
        <>
          /<wbr />
        </>
      ) : null}
    </span>
  ));
}

/**
 * How one step looks. `emailReady` matters for emails that hit a setup error:
 * while email is still blocked they are "waiting"; once it works, they were
 * simply not sent (nothing retries them).
 */
export function stepView(
  record: StepRecord | null,
  emailReady = false,
): { state: RailState; label: string; note?: ReactNode } {
  if (!record) return { state: "neutral", label: "Not yet" };
  switch (record.status) {
    case "pending":
      return { state: "pending", label: "Sending…" };
    case "done":
      return { state: "done", label: "Sent" };
    case "skipped":
      return { state: "skipped", label: "Skipped", note: SKIP_NOTES[record.reason] };
    case "failed": {
      const setup = isEmailSetupFailure(record.failure);
      if (setup && emailReady) {
        return {
          state: "skipped",
          label: "Not sent",
          note: "Email wasn’t set up yet when this ran. Email works now, so the next ones go out.",
        };
      }
      return {
        state: setup ? "current" : "failed",
        label: setup ? "Waiting on email setup" : "Failed",
        note: (
          <>
            <span className="block text-ink">
              {FAILURE_HINTS[record.failure.kind] ?? "Customer.io did not accept it."}
            </span>
            <span className="mt-0.5 block font-mono text-[0.8125rem] leading-5 break-words">
              {record.failure.status ? `${record.failure.status} ` : ""}
              {record.failure.message}
            </span>
          </>
        ),
      };
    }
  }
}

export function SignupTrace({
  steps,
  region,
  signedUpAt,
  emailReady,
}: {
  steps: Record<string, unknown> | undefined;
  region: CustomerioRegion;
  signedUpAt: Date | null;
  emailReady: boolean;
}) {
  const endpoints = signupEndpoints(region);
  const rows: { key: TraceKey; title: string; call: string; payload?: string }[] = [
    {
      key: "identify_lead",
      title: "Saved as a lead",
      call: `${endpoints.identify.method} ${endpoints.identify.url}`,
      payload: "email, email_verified: false",
    },
    {
      key: "signup_started",
      title: "Event: signup_started",
      call: `${endpoints.event.method} ${endpoints.event.url}`,
    },
    {
      key: "identify",
      title: "Saved as a customer",
      call: `${endpoints.identify.method} ${endpoints.identify.url}`,
      payload: "email, email_verified: true, created_at",
    },
    {
      key: "signed_up",
      title: "Event: signed_up",
      call: `${endpoints.event.method} ${endpoints.event.url}`,
    },
    {
      key: "welcome_email",
      title: "Welcome email",
      call: `${endpoints.email.method} ${endpoints.email.url}`,
    },
    {
      key: "owner_notification",
      title: "Note to the owner",
      call: `${endpoints.email.method} ${endpoints.email.url}`,
    },
  ];

  const railSteps: RailStep[] = rows.map((row) => {
    const record = readStep(steps, row.key);
    const view = stepView(record, emailReady);
    const at = record ? new Date(record.at) : null;
    return {
      key: row.key,
      title: row.title,
      label: view.label,
      state: view.state,
      children: (
        <>
          <span className="block font-mono text-[0.8125rem] leading-5 break-words text-faint">
            <BreakableUrl url={row.call} />
          </span>
          {row.payload ? (
            <span className="block font-mono text-[0.8125rem] leading-5 text-faint">
              {row.payload}
            </span>
          ) : null}
          {view.note ? <span className="mt-1 block">{view.note}</span> : null}
          {at && !Number.isNaN(at.getTime()) && record?.status !== "pending" ? (
            <time
              dateTime={at.toISOString()}
              className="mt-0.5 block text-xs text-faint tabular-nums"
            >
              {at.toISOString().replace("T", " ").slice(0, 19)} UTC
            </time>
          ) : null}
        </>
      ),
    };
  });

  return (
    <div>
      {!signedUpAt ? (
        <p className="mb-4 text-sm text-muted">
          The signup steps run the first time you open a sign-in link.
        </p>
      ) : null}
      <Rail steps={railSteps} />
    </div>
  );
}
