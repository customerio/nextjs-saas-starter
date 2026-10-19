import type { TraceState, TraceStep } from "@/components/signup-trace";
import {
  isEmailSetupFailure,
  signupEndpoints,
  SIGNED_UP_EVENT,
  type CustomerioFailure,
  type CustomerioRegion,
  type FailureKind,
  type SignupReport,
  type SkipReason,
  type StepResult,
} from "@/lib/customerio";

const Var = ({ children }: { children: string }) => (
  <code className="font-mono text-[0.8125rem] text-ink">{children}</code>
);

const SKIP_NOTES: Record<SkipReason, React.ReactNode> = {
  missing_track_keys: (
    <>
      <Var>CUSTOMERIO_SITE_ID</Var> and <Var>CUSTOMERIO_TRACK_API_KEY</Var> are not set here.
    </>
  ),
  missing_app_key: (
    <>
      <Var>CUSTOMERIO_APP_API_KEY</Var> is not set here. The integration adds it to Production and
      Preview, not Development.
    </>
  ),
  missing_from_email: (
    <>
      Set <Var>CUSTOMERIO_FROM_EMAIL</Var> to an address on a verified domain, or set{" "}
      <Var>CUSTOMERIO_WELCOME_MESSAGE_ID</Var>.
    </>
  ),
  identify_failed: "Not sent, because adding the person failed.",
};

const FAILURE_HINTS: Partial<Record<FailureKind, string>> = {
  owner_email_unconfirmed: "The account owner has not confirmed their email yet.",
  account_not_approved: "Customer.io has not approved this account for sending yet.",
  no_from_address: "The workspace has no verified sending domain yet.",
  from_domain_unverified: "The sender's domain is not verified yet.",
  unauthorized:
    "Customer.io did not accept the key. Check it, and check that CUSTOMERIO_REGION matches your workspace.",
  message_not_found: "No transactional message has the ID in CUSTOMERIO_WELCOME_MESSAGE_ID.",
  rate_limited: "Too many requests. Try again in a minute.",
  server_error: "A problem on the Customer.io side. Try again in a minute.",
  timeout: "Customer.io did not answer in time. Try again in a minute.",
  network: "Could not reach Customer.io. Try again in a minute.",
};

function FailureNote({ failure }: { failure: CustomerioFailure }) {
  return (
    <>
      <p className="text-ink">
        {FAILURE_HINTS[failure.kind] ?? "Customer.io did not accept the request."}
      </p>
      <p className="mt-1 font-mono text-[0.8125rem] leading-5 break-words">
        {failure.status ? `${failure.status}: ` : ""}
        {failure.message}
      </p>
    </>
  );
}

function view(result: StepResult): { state: TraceState; note?: React.ReactNode } {
  switch (result.status) {
    case "done":
      return {
        state: "done",
        note: result.detail ? (
          <>
            Delivery <Var>{result.detail}</Var>
          </>
        ) : undefined,
      };
    case "skipped":
      return { state: "skipped", note: SKIP_NOTES[result.reason] };
    case "failed":
      return {
        state: isEmailSetupFailure(result.failure) ? "waiting" : "failed",
        note: <FailureNote failure={result.failure} />,
      };
  }
}

/** Skip the repeat note when the event was skipped for the same reason as identify. */
function eventView(report: SignupReport) {
  const { identify, event } = report;
  if (
    event.status === "skipped" &&
    identify.status === "skipped" &&
    event.reason === identify.reason
  ) {
    return { state: "skipped" as const, note: "Same reason as above." };
  }
  return view(event);
}

export function reportSteps(report: SignupReport | null, region: CustomerioRegion): TraceStep[] {
  const endpoints = signupEndpoints(region);
  const planned = { state: "planned" as const };
  return [
    {
      title: "Add the person",
      ...endpoints.identify,
      payload: "id, email, name, created_at",
      ...(report ? view(report.identify) : planned),
    },
    {
      title: "Record the event",
      ...endpoints.event,
      payload: `name: "${SIGNED_UP_EVENT}"`,
      ...(report ? eventView(report) : planned),
    },
    {
      title: "Send the welcome email",
      ...endpoints.email,
      payload: "to, identifiers, subject, body",
      ...(report ? view(report.email) : planned),
    },
  ];
}
