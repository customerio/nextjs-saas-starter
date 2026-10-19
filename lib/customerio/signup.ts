import "server-only";

import { SendEmailRequest, type APIClient, type TrackClient } from "customerio-node";

import { createAppClient, createTrackClient } from "./clients";
import { getCustomerioConfig, type CustomerioConfig } from "./config";
import { classifyError, type CustomerioFailure } from "./errors";
import { welcomeEmail } from "./welcome-email";

/**
 * What this app tells Customer.io when someone signs up or signs in.
 *
 * Every function here returns a result and never throws: a Customer.io
 * problem must never block a person from signing up.
 */

/** The event a campaign can trigger on. Keep the name stable once you use it. */
export const SIGNED_UP_EVENT = "signed_up";

export interface Person {
  /** Your stable user ID. Never the email: people change their email. */
  id: string;
  email: string;
  name: string | null;
  /** How they signed in, sent with the event so campaigns can branch on it. */
  method: string;
}

export type SkipReason =
  "missing_track_keys" | "missing_app_key" | "missing_from_email" | "identify_failed";

export type StepResult =
  | { status: "done"; detail: string | null }
  | { status: "skipped"; reason: SkipReason }
  | { status: "failed"; failure: CustomerioFailure };

export interface SignupReport {
  identify: StepResult;
  event: StepResult;
  email: StepResult;
}

/** The parts of the SDK clients we use. Tests pass fakes with the same shape. */
export interface SignupDeps {
  config: CustomerioConfig;
  track: Pick<TrackClient, "identify" | "track"> | null;
  app: Pick<APIClient, "sendEmail"> | null;
  appName: string;
  dashboardUrl: string;
  now: () => Date;
}

export function defaultDeps(options: { appName: string; dashboardUrl: string }): SignupDeps {
  const config = getCustomerioConfig();
  return {
    config,
    track: createTrackClient(config),
    app: createAppClient(config),
    now: () => new Date(),
    ...options,
  };
}

/** Runs one Customer.io call and turns the outcome into a {@link StepResult}. */
async function attempt(
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

const unixSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

/**
 * Create or update the person in Customer.io.
 *
 * Send `created_at` only on signup. Sending it on every sign-in would move
 * their signup date and break segments like "signed up in the last 7 days".
 */
export function identifyPerson(
  person: Person,
  deps: SignupDeps,
  options: { isNew: boolean },
): Promise<StepResult> {
  const { track } = deps;
  if (!track) return Promise.resolve({ status: "skipped", reason: "missing_track_keys" });

  return attempt(() =>
    track.identify(person.id, {
      email: person.email,
      ...(person.name ? { name: person.name } : {}),
      ...(options.isNew ? { created_at: unixSeconds(deps.now()) } : {}),
    }),
  );
}

/** Record the `signed_up` event. Build a campaign on it in Customer.io. */
export function trackSignedUp(person: Person, deps: SignupDeps): Promise<StepResult> {
  const { track } = deps;
  if (!track) return Promise.resolve({ status: "skipped", reason: "missing_track_keys" });

  return attempt(() =>
    track.track(person.id, {
      name: SIGNED_UP_EVENT,
      data: { method: person.method },
    }),
  );
}

/**
 * Send the welcome email through the Transactional API.
 *
 * With CUSTOMERIO_WELCOME_MESSAGE_ID set, Customer.io renders the message you
 * designed there. Without it, we send the inline email from `welcome-email.ts`.
 */
export function sendWelcomeEmail(person: Person, deps: SignupDeps): Promise<StepResult> {
  const { app, config } = deps;
  if (!app) return Promise.resolve({ status: "skipped", reason: "missing_app_key" });

  // `identifiers` ties the delivery to the person's profile in Customer.io.
  const shared = { to: person.email, identifiers: { id: person.id } };
  let request: SendEmailRequest;

  if (config.welcomeMessageId) {
    request = new SendEmailRequest({
      ...shared,
      transactional_message_id: config.welcomeMessageId,
      // Use these in your message as {{ trigger.name }} and so on.
      message_data: {
        name: person.name ?? "",
        app_name: deps.appName,
        dashboard_url: deps.dashboardUrl,
      },
    });
  } else {
    if (!config.fromEmail) {
      return Promise.resolve({ status: "skipped", reason: "missing_from_email" });
    }
    const email = welcomeEmail({
      name: person.name,
      appName: deps.appName,
      dashboardUrl: deps.dashboardUrl,
    });
    request = new SendEmailRequest({
      ...shared,
      from: config.fromEmail,
      subject: email.subject,
      body: email.html,
      body_plain: email.plain,
    });
  }

  return attempt(
    () => app.sendEmail(request),
    (response) => {
      const id = (response as { delivery_id?: unknown } | null)?.delivery_id;
      return typeof id === "string" ? id : null;
    },
  );
}

/**
 * The full signup flow: identify, then the event, then the welcome email.
 *
 * Order matters. Identify first so the person exists when the event arrives.
 * The email does not depend on the event, so it still goes out if only the
 * event failed.
 */
export async function recordSignup(person: Person, deps: SignupDeps): Promise<SignupReport> {
  const identify = await identifyPerson(person, deps, { isNew: true });

  const event: StepResult =
    identify.status === "failed"
      ? { status: "skipped", reason: "identify_failed" }
      : await trackSignedUp(person, deps);

  const email = await sendWelcomeEmail(person, deps);

  return { identify, event, email };
}
