import type { Readiness } from "@/lib/customerio/readiness";

/**
 * Who may see setup details (the status page, the email checklist, "Check
 * again"). Only the owner: the signed-in person whose email is OWNER_EMAIL.
 *
 * Without OWNER_EMAIL, local dev lets any signed-in person in (it is your
 * machine). Everywhere else nobody gets in until you set it.
 */
export type OwnerAccess = "owner" | "not_owner" | "no_owner_email";

export function ownerAccess(input: {
  ownerEmail: string | null;
  signedInEmail: string | null | undefined;
  isDev: boolean;
}): OwnerAccess {
  if (!input.signedInEmail) return "not_owner";
  if (!input.ownerEmail) return input.isDev ? "owner" : "no_owner_email";
  return input.signedInEmail.trim().toLowerCase() === input.ownerEmail ? "owner" : "not_owner";
}

/**
 * The one line a visitor sees on public pages when sign-in emails can't go
 * out. No setup details: those are for the owner, on the status page.
 */
export function visitorNotice(readiness: Readiness, isDev: boolean): string | null {
  if (readiness.kind === "blocked") return "Sign-in emails aren’t on yet. Try again soon.";
  if (readiness.kind === "no_app_key") {
    return isDev
      ? "Running locally: your sign-in link prints in the terminal."
      : "Sign-in emails aren’t on yet. Try again soon.";
  }
  return null;
}
