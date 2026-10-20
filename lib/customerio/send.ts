import { SendEmailRequest, type APIClient, type Identifiers } from "customerio-node";

import type { EmailContent } from "./emails";
import { attempt, skipped, type StepResult } from "./steps";

/** The part of the App API client we use. Tests pass a fake with this shape. */
export type Mailer = Pick<APIClient, "sendEmail">;

export interface SendInput {
  to: string;
  /** Ties the delivery to a profile in Customer.io. */
  identifiers: Identifiers;
  /** CUSTOMERIO_FROM_EMAIL. When null, Customer.io uses the default sender of your verified domain. */
  from: string | null;
  /** A transactional message ID. When set, Customer.io renders that message with `messageData`. */
  messageId: string | null;
  messageData: Record<string, unknown>;
  /** The built-in email, used when there is no message ID. */
  content: EmailContent;
  /**
   * For emails that carry a sign-in link: no click tracking (the link stays
   * exactly as we made it) and no copy kept in Customer.io's message archive.
   */
  sensitive?: boolean;
}

/** Sends one email through the Transactional API. Never throws, never retries. */
export function sendEmail(app: Mailer | null, input: SendInput): Promise<StepResult> {
  if (!app) return Promise.resolve(skipped("missing_app_key"));

  const shared = {
    to: input.to,
    identifiers: input.identifiers,
    ...(input.sensitive
      ? { tracked: false, disable_message_retention: true, send_to_unsubscribed: true }
      : {}),
  };

  const request = input.messageId
    ? new SendEmailRequest({
        ...shared,
        transactional_message_id: input.messageId,
        message_data: input.messageData,
      })
    : new SendEmailRequest({
        ...shared,
        // The SDK types say `from` is required, but the API accepts a missing
        // `from` when the workspace has a verified domain to use as default.
        // If it has none, the answer tells us so ("no_from_address").
        from: input.from ?? (undefined as unknown as string),
        subject: input.content.subject,
        body: input.content.html,
        body_plain: input.content.plain,
      });

  return attempt(
    () => app.sendEmail(request),
    (response) => {
      const id = (response as { delivery_id?: unknown } | null)?.delivery_id;
      return typeof id === "string" ? id : null;
    },
  );
}
