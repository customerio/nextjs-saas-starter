import { CustomerIORequestError, type SendEmailRequest } from "customerio-node";
import { describe, expect, it, vi } from "vitest";

import { readCustomerioConfig } from "./config";
import { identifyPerson, recordSignup, type Person, type SignupDeps } from "./signup";

const person: Person = { id: "demo-1", email: "ada@example.com", name: "Ada", method: "demo" };
const NOW = new Date("2026-10-19T12:00:00Z");

const FULL_ENV = {
  CUSTOMERIO_SITE_ID: "site",
  CUSTOMERIO_TRACK_API_KEY: "track-key",
  CUSTOMERIO_APP_API_KEY: "app-key",
  CUSTOMERIO_FROM_EMAIL: "hello@example.com",
};

function fakeDeps(env: Record<string, string> = FULL_ENV) {
  const config = readCustomerioConfig(env);
  const track = {
    identify: vi.fn(async () => ({})),
    track: vi.fn(async () => ({})),
  };
  const app = {
    sendEmail: vi.fn<(request: SendEmailRequest) => Promise<Record<string, unknown>>>(async () => ({
      delivery_id: "delivery-1",
    })),
  };
  const deps: SignupDeps = {
    config,
    track: config.track ? track : null,
    app: config.appApiKey ? app : null,
    appName: "Test App",
    dashboardUrl: "https://example.com/dashboard",
    now: () => NOW,
  };
  return { deps, track, app };
}

function edgeError(status: number, message: string) {
  const json = { meta: { error: message } };
  return new CustomerIORequestError(
    json,
    status,
    { statusCode: status, headers: {}, ok: false },
    "",
  );
}

describe("recordSignup", () => {
  it("identifies, tracks signed_up, and sends the welcome email", async () => {
    const { deps, track, app } = fakeDeps();
    const report = await recordSignup(person, deps);

    expect(report).toEqual({
      identify: { status: "done", detail: null },
      event: { status: "done", detail: null },
      email: { status: "done", detail: "delivery-1" },
    });
    expect(track.identify).toHaveBeenCalledWith("demo-1", {
      email: "ada@example.com",
      name: "Ada",
      created_at: Math.floor(NOW.getTime() / 1000),
    });
    expect(track.track).toHaveBeenCalledWith("demo-1", {
      name: "signed_up",
      data: { method: "demo" },
    });
    const message = app.sendEmail.mock.calls[0]?.[0].message;
    expect(message).toMatchObject({
      to: "ada@example.com",
      identifiers: { id: "demo-1" },
      from: "hello@example.com",
      subject: "Welcome to Test App",
    });
  });

  it("skips everything, without throwing, when no keys are set", async () => {
    const { deps } = fakeDeps({});
    expect(await recordSignup(person, deps)).toEqual({
      identify: { status: "skipped", reason: "missing_track_keys" },
      event: { status: "skipped", reason: "missing_track_keys" },
      email: { status: "skipped", reason: "missing_app_key" },
    });
  });

  it("records an unapproved account instead of failing signup", async () => {
    const { deps, app } = fakeDeps();
    app.sendEmail.mockRejectedValueOnce(edgeError(403, "Account is not yet approved for sending."));

    const report = await recordSignup(person, deps);
    expect(report.identify.status).toBe("done");
    expect(report.event.status).toBe("done");
    expect(report.email).toMatchObject({
      status: "failed",
      failure: { kind: "account_not_approved", status: 403 },
    });
  });

  it("skips the event but still tries the email when identify fails", async () => {
    const { deps, track, app } = fakeDeps();
    track.identify.mockRejectedValueOnce(edgeError(401, "Unauthorized"));

    const report = await recordSignup(person, deps);
    expect(report.identify).toMatchObject({ status: "failed", failure: { kind: "unauthorized" } });
    expect(report.event).toEqual({ status: "skipped", reason: "identify_failed" });
    expect(track.track).not.toHaveBeenCalled();
    expect(app.sendEmail).toHaveBeenCalledOnce();
  });

  it("skips the inline email when no from address is set", async () => {
    const env: Record<string, string> = { ...FULL_ENV };
    delete env.CUSTOMERIO_FROM_EMAIL;
    const { deps, app } = fakeDeps(env);

    const report = await recordSignup(person, deps);
    expect(report.email).toEqual({ status: "skipped", reason: "missing_from_email" });
    expect(app.sendEmail).not.toHaveBeenCalled();
  });

  it("sends the transactional message from Customer.io when its ID is set", async () => {
    const { deps, app } = fakeDeps({ ...FULL_ENV, CUSTOMERIO_WELCOME_MESSAGE_ID: "welcome" });
    await recordSignup(person, deps);

    const message = app.sendEmail.mock.calls[0]?.[0].message;
    expect(message).toMatchObject({
      transactional_message_id: "welcome",
      message_data: { name: "Ada", app_name: "Test App" },
    });
    expect(message).not.toHaveProperty("body");
  });

  it("escapes the person's name in the inline HTML", async () => {
    const { deps, app } = fakeDeps();
    await recordSignup({ ...person, name: "<script>x</script>" }, deps);
    const body = app.sendEmail.mock.calls[0]?.[0].message.body;
    expect(body).toContain("&lt;script&gt;");
    expect(body).not.toContain("<script>");
  });
});

describe("identifyPerson", () => {
  it("does not send created_at for a returning person", async () => {
    const { deps, track } = fakeDeps();
    await identifyPerson(person, deps, { isNew: false });
    expect(track.identify).toHaveBeenCalledWith("demo-1", {
      email: "ada@example.com",
      name: "Ada",
    });
  });
});
