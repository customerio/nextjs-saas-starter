import type { CustomerioConfig } from "./config";
import { isEmailSetupFailure, type FailureKind } from "./errors";
import type { StepResult } from "./steps";

/**
 * Can this workspace send email yet?
 *
 * A new Customer.io workspace cannot, until three things are done. Customer.io
 * checks them in this order and answers with the first one that is open:
 *
 *   1. the account owner confirms their email address,
 *   2. Customer.io approves the account for sending,
 *   3. a sending domain is verified.
 *
 * We never ask Customer.io about this directly. Instead, every email this app
 * sends is also a check: the answer is stored in the `email_status` row. A
 * success flips it to "ready"; one of the setup errors flips it to "blocked".
 */

/** What we store after a send. `null` means "leave the stored state alone". */
export interface EmailStatusUpdate {
  state: "ready" | "blocked";
  reason: FailureKind | null;
  message: string | null;
  httpStatus: number | null;
}

/**
 * The state change a send result causes.
 *
 * Only two kinds of answers say something about the workspace: a success
 * (it can send) and a setup error (it cannot, and here is why). A timeout, a
 * bad key, or a missing message ID says nothing about readiness, so it leaves
 * the stored state as it was.
 */
export function statusAfterSend(result: StepResult): EmailStatusUpdate | null {
  if (result.status === "done") {
    return { state: "ready", reason: null, message: null, httpStatus: null };
  }
  if (result.status === "failed" && isEmailSetupFailure(result.failure)) {
    return {
      state: "blocked",
      reason: result.failure.kind,
      message: result.failure.message,
      httpStatus: result.failure.status,
    };
  }
  return null;
}

export type SetupStepId = "confirm_owner_email" | "account_approval" | "sending_domain";

/** The three checks in Customer.io's order, and the errors that mean each one is open. */
export const SETUP_STEPS: readonly { id: SetupStepId; kinds: readonly FailureKind[] }[] = [
  { id: "confirm_owner_email", kinds: ["owner_email_unconfirmed"] },
  { id: "account_approval", kinds: ["account_not_approved"] },
  { id: "sending_domain", kinds: ["no_from_address", "from_domain_unverified"] },
];

/**
 * - done:     Customer.io got past this check.
 * - current:  this is the check that stopped the last send.
 * - waiting:  Customer.io has not looked at it yet, because an earlier check is open.
 * - unknown:  we have not sent anything yet, so we do not know.
 */
export type SetupStepState = "done" | "current" | "waiting" | "unknown";

export type Readiness =
  /** The last send worked. */
  | { kind: "ready"; checkedAt: Date }
  /** The last send hit a setup error. */
  | {
      kind: "blocked";
      reason: FailureKind;
      message: string | null;
      httpStatus: number | null;
      checkedAt: Date;
    }
  /** No App API key, so the app cannot send at all. Normal in local dev. */
  | { kind: "no_app_key" }
  /** Nothing sent yet. The first sign-in link will tell us. */
  | { kind: "unknown" };

export interface StoredEmailStatus {
  state: "ready" | "blocked";
  reason: string | null;
  message: string | null;
  httpStatus: number | null;
  checkedAt: Date;
}

const SETUP_KINDS = new Set<string>(
  SETUP_STEPS.flatMap((step) => step.kinds).concat("delivery_disabled"),
);

export function readiness(config: CustomerioConfig, stored: StoredEmailStatus | null): Readiness {
  if (!config.appApiKey) return { kind: "no_app_key" };
  if (!stored) return { kind: "unknown" };
  if (stored.state === "ready") return { kind: "ready", checkedAt: stored.checkedAt };
  if (stored.reason && SETUP_KINDS.has(stored.reason)) {
    return {
      kind: "blocked",
      reason: stored.reason as FailureKind,
      message: stored.message,
      httpStatus: stored.httpStatus,
      checkedAt: stored.checkedAt,
    };
  }
  // A row we do not understand (for example from an older version): check again.
  return { kind: "unknown" };
}

export function isReady(value: Readiness): boolean {
  return value.kind === "ready";
}

/** The state of each of the three checks, for the checklist. */
export function setupChecklist(value: Readiness): { id: SetupStepId; state: SetupStepState }[] {
  if (value.kind === "ready") return SETUP_STEPS.map(({ id }) => ({ id, state: "done" }));
  if (value.kind !== "blocked") return SETUP_STEPS.map(({ id }) => ({ id, state: "unknown" }));

  const currentIndex = SETUP_STEPS.findIndex((step) => step.kinds.includes(value.reason));
  // "Do Not Send" is a workspace setting outside the three checks. Customer.io
  // checks it after approval, so the first two are done.
  const index = currentIndex === -1 ? 2 : currentIndex;
  return SETUP_STEPS.map(({ id }, i) => ({
    id,
    state:
      currentIndex === -1 && i === 2
        ? "unknown"
        : i < index
          ? "done"
          : i === index
            ? "current"
            : "waiting",
  }));
}
