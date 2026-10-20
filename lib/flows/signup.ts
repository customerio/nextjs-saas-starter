import { emailCheckEmail, ownerNotificationEmail, welcomeEmail } from "@/lib/customerio/emails";
import { sendEmail } from "@/lib/customerio/send";
import { skipped, type StepRecord, type StepResult } from "@/lib/customerio/steps";
import { identify, trackEvent, unixSeconds } from "@/lib/customerio/track";
import { claimSignup, countEarlierSignups, saveStep } from "@/lib/db/store";

import type { FlowDeps } from "./deps";
import { recordSendOutcome } from "./email-status";

export const SIGNED_UP_EVENT = "signed_up";

/** The steps of a signup, in order, as stored in `signups.steps`. */
export const SIGNUP_STEPS = [
  "identify",
  "signed_up",
  "welcome_email",
  "owner_notification",
] as const;
export type SignupStep = (typeof SIGNUP_STEPS)[number];

/**
 * Runs on every successful sign-in. Only the first verified sign-in of a
 * person is a signup: `claimSignup` sets `signed_up_at` with one atomic
 * UPDATE, so if two browsers (or a double click) arrive at once, exactly one
 * of them runs the steps below. Returns whether this call was the signup.
 *
 * The Customer.io calls run after the response (`deps.defer`), so sign-in is
 * never slowed down or blocked by them.
 */
export async function handleSignIn(
  deps: FlowDeps,
  user: { id: string; email: string },
): Promise<boolean> {
  const signedUpAt = deps.now();
  if (!(await claimSignup(deps.db, user.id, signedUpAt))) return false;

  const pending: StepRecord = { status: "pending", at: signedUpAt.toISOString() };
  for (const step of SIGNUP_STEPS) await saveStep(deps.db, user.id, step, pending);

  deps.defer(() => runSignupSteps(deps, user, signedUpAt));
  return true;
}

async function runSignupSteps(
  deps: FlowDeps,
  user: { id: string; email: string },
  signedUpAt: Date,
): Promise<void> {
  const save = (step: SignupStep, result: StepResult) =>
    saveStep(deps.db, user.id, step, {
      ...result,
      at: deps.now().toISOString(),
    } satisfies StepRecord);
  const warn = (step: string, result: StepResult) => {
    if (result.status === "failed") {
      deps.log.warn(`[customerio] ${step} failed:`, result.failure.kind, result.failure.message);
    }
  };

  // 1. The person, with the signup time. Send `created_at` only here: sending
  //    it on every sign-in would move their signup date in Customer.io.
  const person = await identify(deps.track, user.id, {
    email: user.email,
    email_verified: true,
    created_at: unixSeconds(signedUpAt),
  });
  warn("identify", person);
  await save("identify", person);

  // 2. The event your campaigns can start on.
  const event =
    person.status === "failed"
      ? skipped("identify_failed")
      : await trackEvent(deps.track, user.id, SIGNED_UP_EVENT, { method: "email" });
  warn("signed_up event", event);
  await save("signed_up", event);

  // 3. The welcome email. It does not depend on the event, so it still goes
  //    out if only the event failed.
  const dashboardUrl = `${deps.siteUrl}/dashboard`;
  const welcome = await sendEmail(deps.app, {
    to: user.email,
    identifiers: { id: user.id },
    from: deps.config.fromEmail,
    messageId: deps.config.welcomeMessageId,
    messageData: { app_name: deps.appName, dashboard_url: dashboardUrl },
    content: welcomeEmail({ appName: deps.appName, dashboardUrl }),
  });
  warn("welcome email", welcome);
  await recordSendOutcome(deps, welcome);
  await save("welcome_email", welcome);

  // 4. Tell the owner. Skip it when the owner is the one signing up.
  const owner = deps.config.ownerEmail;
  let notification: StepResult;
  if (!owner) {
    notification = skipped("no_owner_email");
  } else if (owner === user.email) {
    notification = skipped("owner_signed_up");
  } else {
    const isFirst = (await countEarlierSignups(deps.db, user.id, owner)) === 0;
    notification = await sendEmail(deps.app, {
      to: owner,
      identifiers: { email: owner },
      from: deps.config.fromEmail,
      messageId: null,
      messageData: {},
      content: ownerNotificationEmail({
        appName: deps.appName,
        personEmail: user.email,
        isFirst,
        statusUrl: `${deps.siteUrl}/status`,
      }),
    });
    warn("owner notification", notification);
    await recordSendOutcome(deps, notification);
  }
  await save("owner_notification", notification);
}

/**
 * "Check again" on the email setup banner. Sends one short test email and
 * stores the answer, so the banner shows the truth right away.
 *
 * It goes to OWNER_EMAIL, or to the signed-in person when OWNER_EMAIL is not
 * set. While the workspace cannot send, nothing is delivered; the first time
 * it works, that person gets one "Email works" note and the banner goes away.
 */
export type CheckAgainResult =
  { status: "checked"; result: StepResult } | { status: "no_recipient" } | { status: "too_soon" };

export const CHECK_AGAIN_COOLDOWN_SECONDS = 30;

export async function checkEmailAgain(
  deps: FlowDeps,
  input: { signedInUser: { id: string; email: string } | null; lastCheckedAt: Date | null },
): Promise<CheckAgainResult> {
  const owner = deps.config.ownerEmail;
  const to = owner ?? input.signedInUser?.email ?? null;
  if (!to) return { status: "no_recipient" };

  const now = deps.now();
  if (
    input.lastCheckedAt &&
    now.getTime() - input.lastCheckedAt.getTime() < CHECK_AGAIN_COOLDOWN_SECONDS * 1000
  ) {
    return { status: "too_soon" };
  }

  const result = await sendEmail(deps.app, {
    to,
    identifiers: owner || !input.signedInUser ? { email: to } : { id: input.signedInUser.id },
    from: deps.config.fromEmail,
    messageId: null,
    messageData: {},
    content: emailCheckEmail({ appName: deps.appName, statusUrl: `${deps.siteUrl}/status` }),
  });
  await recordSendOutcome(deps, result);
  return { status: "checked", result };
}
