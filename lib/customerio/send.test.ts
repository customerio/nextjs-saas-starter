import type { SendEmailRequest } from "customerio-node";
import { describe, expect, it, vi } from "vitest";

import { magicLinkEmail } from "./emails";
import { sendEmail, type SendInput } from "./send";
import { edgeError, NOT_APPROVED } from "@/tests/fakes";

const content = magicLinkEmail({
  appName: "Acme",
  url: "https://acme.test/link?token=t",
  expiresInMinutes: 15,
});
const input: SendInput = {
  to: "ada@example.com",
  identifiers: { id: "u1" },
  from: "Acme <hello@acme.test>",
  messageId: null,
  messageData: { url: "https://acme.test/link?token=t" },
  content,
};

function mailer() {
  return {
    sendEmail: vi.fn<(request: SendEmailRequest) => Promise<object>>(async () => ({
      delivery_id: "d-1",
    })),
  };
}

describe("sendEmail", () => {
  it("sends the inline email and returns the delivery ID", async () => {
    const app = mailer();
    expect(await sendEmail(app, input)).toEqual({ status: "done", detail: "d-1" });
    expect(app.sendEmail.mock.calls[0]?.[0].message).toMatchObject({
      to: "ada@example.com",
      identifiers: { id: "u1" },
      from: "Acme <hello@acme.test>",
      subject: "Sign in to Acme",
    });
  });

  it("leaves out `from` when none is set, so Customer.io uses the verified domain", async () => {
    const app = mailer();
    await sendEmail(app, { ...input, from: null });
    const body = JSON.parse(JSON.stringify(app.sendEmail.mock.calls[0]?.[0].message));
    expect(body).not.toHaveProperty("from");
  });

  it("turns off tracking and retention for emails with a sign-in link", async () => {
    const app = mailer();
    await sendEmail(app, { ...input, sensitive: true });
    expect(app.sendEmail.mock.calls[0]?.[0].message).toMatchObject({
      tracked: false,
      disable_message_retention: true,
      send_to_unsubscribed: true,
    });
  });

  it("sends a designed transactional message with message_data when an ID is set", async () => {
    const app = mailer();
    await sendEmail(app, { ...input, messageId: "7" });
    const message = app.sendEmail.mock.calls[0]?.[0].message;
    expect(message).toMatchObject({
      transactional_message_id: "7",
      message_data: input.messageData,
    });
    expect(message).not.toHaveProperty("body");
  });

  it("returns a typed failure instead of throwing", async () => {
    const app = mailer();
    app.sendEmail.mockRejectedValueOnce(edgeError(403, NOT_APPROVED));
    expect(await sendEmail(app, input)).toMatchObject({
      status: "failed",
      failure: { kind: "account_not_approved", status: 403 },
    });
  });

  it("skips without an App API key", async () => {
    expect(await sendEmail(null, input)).toEqual({ status: "skipped", reason: "missing_app_key" });
  });

  it("keeps the built-in sign-in email free of anything but the link", () => {
    expect(content.html).toContain("https://acme.test/link?token=t");
    expect(content.plain).toContain("expires in 15 minutes");
  });
});
