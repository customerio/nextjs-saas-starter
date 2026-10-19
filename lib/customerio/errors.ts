import { CustomerIORequestError } from "customerio-node";

/**
 * Turns anything a Customer.io call can throw into one small, typed value.
 *
 * The most common failure in a new workspace is not a bug: Customer.io does
 * not send email until the account owner confirms their address, the account
 * is approved, and a sending domain is verified. Those cases get their own
 * kinds so the UI can show the exact next step.
 */
export type FailureKind =
  /** 403: the account owner has not clicked the link in their confirmation email. */
  | "owner_email_unconfirmed"
  /** 403: Customer.io has not approved the account for sending yet. */
  | "account_not_approved"
  /** 400: no `from` given, and the workspace has no verified domain to fall back to. */
  | "no_from_address"
  /** 400: the `from` address uses a domain that is not verified. */
  | "from_domain_unverified"
  /** 401: the key is wrong, revoked, or for another region. */
  | "unauthorized"
  /** 404: CUSTOMERIO_WELCOME_MESSAGE_ID does not match a transactional message. */
  | "message_not_found"
  /** 429: too many requests. Safe to try again later. */
  | "rate_limited"
  /** 5xx: a problem on the Customer.io side. Safe to try again later. */
  | "server_error"
  /** Any other 4xx: the request itself was wrong. */
  | "invalid_request"
  /** No response in time. */
  | "timeout"
  /** DNS, TLS, or connection failure. */
  | "network"
  | "unknown";

export interface CustomerioFailure {
  kind: FailureKind;
  /** HTTP status, when Customer.io answered. */
  status: number | null;
  /** The message from Customer.io (or the runtime), cut to a safe length. */
  message: string;
}

/** Failures the workspace owner fixes in Customer.io settings, not in code. */
const EMAIL_SETUP_KINDS: ReadonlySet<FailureKind> = new Set([
  "owner_email_unconfirmed",
  "account_not_approved",
  "no_from_address",
  "from_domain_unverified",
]);

export function isEmailSetupFailure(failure: CustomerioFailure): boolean {
  return EMAIL_SETUP_KINDS.has(failure.kind);
}

/** Failures where the same request may work if you try again later. */
const TEMPORARY_KINDS: ReadonlySet<FailureKind> = new Set([
  "rate_limited",
  "server_error",
  "timeout",
  "network",
]);

export function isTemporaryFailure(failure: CustomerioFailure): boolean {
  return TEMPORARY_KINDS.has(failure.kind);
}

const MAX_MESSAGE_LENGTH = 280;

function shorten(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > MAX_MESSAGE_LENGTH ? `${clean.slice(0, MAX_MESSAGE_LENGTH - 1)}…` : clean;
}

function isRequestError(error: unknown): error is CustomerIORequestError {
  return (
    error instanceof CustomerIORequestError ||
    (error instanceof Error && error.name === "CustomerIORequestError" && "statusCode" in error)
  );
}

/** Reads the error message out of a response, matching on stable phrases. */
function kindFromResponse(status: number, text: string): FailureKind {
  const lower = text.toLowerCase();

  if (status === 403) {
    if (lower.includes("email address is not confirmed")) return "owner_email_unconfirmed";
    if (lower.includes("not yet approved for sending")) return "account_not_approved";
  }
  if (status === 400) {
    if (lower.includes('no "from" address')) return "no_from_address";
    if (lower.includes('"from" address domain') && lower.includes("not been verified")) {
      return "from_domain_unverified";
    }
  }

  if (status === 401 || status === 403) return "unauthorized";
  if (status === 404) return "message_not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "invalid_request";
}

export function classifyError(error: unknown): CustomerioFailure {
  if (isRequestError(error)) {
    // `message` holds the parsed error. `body` is the raw text, useful when the
    // response was not the usual `{ meta: { error } }` JSON.
    const message =
      error.message && error.message !== "Unknown error" ? error.message : error.body || "";
    return {
      kind: kindFromResponse(error.statusCode, `${message} ${error.body}`),
      status: error.statusCode,
      message: shorten(message || `Customer.io answered with HTTP ${error.statusCode}.`),
    };
  }

  // The SDK uses `fetch` with `AbortSignal.timeout`, so timeouts arrive as a
  // DOMException named "TimeoutError" and network errors as a TypeError.
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return { kind: "timeout", status: null, message: "Customer.io did not answer in time." };
  }
  if (error instanceof TypeError) {
    return { kind: "network", status: null, message: shorten(error.message) };
  }

  const message = error instanceof Error ? error.message : String(error);
  return { kind: "unknown", status: null, message: shorten(message) };
}
