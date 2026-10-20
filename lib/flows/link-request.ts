import { isEmailSetupFailure } from "@/lib/customerio/errors";
import { magicLinkEmail } from "@/lib/customerio/emails";
import { sendEmail } from "@/lib/customerio/send";
import { identify, trackEvent } from "@/lib/customerio/track";
import type { StepRecord, StepResult } from "@/lib/customerio/steps";
import { findOrCreateUser, saveStep, startSignup } from "@/lib/db/store";

import type { FlowDeps } from "./deps";
import { recordSendOutcome } from "./email-status";

export const SIGNUP_STARTED_EVENT = "signup_started";

/**
 * - sent:            Customer.io accepted the email.
 * - waiting:         the workspace cannot send yet (setup is not finished).
 * - not_configured:  no App API key here, so nothing was sent (normal in local dev).
 * - failed:          anything else (timeout, bad key, wrong message ID).
 */
export type LinkDelivery = "sent" | "waiting" | "not_configured" | "failed";

export interface LinkRequestOutcome {
  delivery: LinkDelivery;
  /** The sign-in link, only when it is safe to show it on the page. See {@link mayRevealLink}. */
  revealedUrl: string | null;
}

export function deliveryOf(result: StepResult): LinkDelivery {
  if (result.status === "done") return "sent";
  if (result.status === "skipped") return "not_configured";
  return isEmailSetupFailure(result.failure) ? "waiting" : "failed";
}

/**
 * Showing the link on the page skips the email check, so it is allowed only:
 * - on a Vercel Preview deployment (never Production, never off Vercel),
 * - when the email did not go out,
 * - and, if OWNER_EMAIL is set, only for that address.
 *
 * Previews are behind Vercel Authentication by default, so only your team can
 * open them. Local dev prints the link to the terminal instead.
 */
/** The prefix of the owner's sign-in link in the server log. README and tests match on it. */
export const OWNER_LINK_LOG_PREFIX =
  "[acme] Owner sign-in link (shown because email isn't set up yet):";

/**
 * Whether to write this link to the server log (Vercel > Project > Logs).
 * Only for the owner's own email, only while email can't go out, and only
 * off local dev (local dev prints every link anyway). Once a send works,
 * this stops: the owner gets the email like everyone else.
 */
export function shouldLogOwnerLink(
  deps: Pick<FlowDeps, "isDev" | "config">,
  email: string,
  delivery: LinkDelivery,
): boolean {
  if (deps.isDev || delivery === "sent") return false;
  return deps.config.ownerEmail !== null && deps.config.ownerEmail === email;
}

export function mayRevealLink(
  deps: Pick<FlowDeps, "vercelEnv" | "config">,
  email: string,
  delivery: LinkDelivery,
): boolean {
  if (deps.vercelEnv !== "preview" || delivery === "sent") return false;
  return deps.config.ownerEmail === null || deps.config.ownerEmail === email;
}

const record = (deps: FlowDeps, result: StepResult): StepRecord => ({
  ...result,
  at: deps.now().toISOString(),
});

/**
 * Runs inside Auth.js `sendVerificationRequest`, after the rate limit check.
 * Sends the sign-in link through Customer.io and, for someone who has not
 * signed up yet, records them as a lead (`signup_started`).
 */
export async function handleLinkRequest(
  deps: FlowDeps,
  input: { email: string; url: string; expires: Date },
): Promise<LinkRequestOutcome> {
  const user = await findOrCreateUser(deps.db, input.email);
  const minutes = Math.max(
    1,
    Math.round((input.expires.getTime() - deps.now().getTime()) / 60_000),
  );

  const result = await sendEmail(deps.app, {
    to: input.email,
    identifiers: { id: user.id },
    from: deps.config.fromEmail,
    messageId: deps.config.magicLinkMessageId,
    messageData: { url: input.url, app_name: deps.appName, expires_in_minutes: minutes },
    content: magicLinkEmail({ appName: deps.appName, url: input.url, expiresInMinutes: minutes }),
    sensitive: true,
  });
  await recordSendOutcome(deps, result);

  const delivery = deliveryOf(result);
  if (result.status === "failed") {
    deps.log.warn(
      "[customerio] sign-in link not sent:",
      result.failure.kind,
      result.failure.message,
    );
  }
  if (deps.isDev) {
    deps.log.info(`\n[auth] Sign-in link for ${input.email} (dev only):\n${input.url}\n`);
  } else if (shouldLogOwnerLink(deps, input.email, delivery)) {
    // The owner's way in on a fresh deploy, before email works. Never for anyone else.
    deps.log.warn(`${OWNER_LINK_LOG_PREFIX} ${input.url}`);
  }

  if (!user.emailVerified) {
    await startSignup(deps.db, user.id);
    deps.defer(async () => {
      // Your user ID, never the email: people change their email.
      const person = await identify(deps.track, user.id, {
        email: input.email,
        email_verified: false,
      });
      await saveStep(deps.db, user.id, "identify_lead", record(deps, person));
      const event =
        person.status === "failed"
          ? ({ status: "skipped", reason: "identify_failed" } as const)
          : await trackEvent(deps.track, user.id, SIGNUP_STARTED_EVENT);
      await saveStep(deps.db, user.id, "signup_started", record(deps, event));
    });
  }

  return {
    delivery,
    revealedUrl: mayRevealLink(deps, input.email, delivery) ? input.url : null,
  };
}
