import { classifyError, type CustomerioFailure } from "./errors";

/**
 * The outcome of one Customer.io call. Every call in this app returns one of
 * these and never throws: a Customer.io problem must never block sign-in.
 */

export type SkipReason =
  /** CUSTOMERIO_SITE_ID or CUSTOMERIO_TRACK_API_KEY is missing. */
  | "missing_track_keys"
  /** CUSTOMERIO_APP_API_KEY is missing (normal in local dev). */
  | "missing_app_key"
  /** OWNER_EMAIL is not set, so there is nobody to notify. */
  | "no_owner_email"
  /** The person signing up is the owner, so we do not notify them about themselves. */
  | "owner_signed_up"
  /** Identify failed, so the event would land on no one. */
  | "identify_failed";

export type StepResult =
  | { status: "done"; detail: string | null }
  | { status: "skipped"; reason: SkipReason }
  | { status: "failed"; failure: CustomerioFailure };

/** A step result with the time it happened, as stored in the database. */
export type StepRecord = (StepResult | { status: "pending" }) & { at: string };

export const skipped = (reason: SkipReason): StepResult => ({ status: "skipped", reason });

/** Runs one Customer.io call and turns the outcome into a {@link StepResult}. */
export async function attempt(
  call: () => Promise<unknown>,
  detail?: (response: unknown) => string | null,
): Promise<StepResult> {
  try {
    const response = await call();
    return { status: "done", detail: detail?.(response) ?? null };
  } catch (error) {
    return { status: "failed", failure: classifyError(error) };
  }
}
