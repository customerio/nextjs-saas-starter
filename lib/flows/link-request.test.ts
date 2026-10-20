import { beforeEach, describe, expect, it } from "vitest";

import { readEmailStatus, readSignup } from "@/lib/db/store";
import type { Db } from "@/lib/db/store";
import { edgeError, FULL_ENV, fakeDeps, NOT_APPROVED } from "@/tests/fakes";
import { setupTestDb } from "@/tests/db";

import { handleLinkRequest, OWNER_LINK_LOG_PREFIX } from "./link-request";
import { handleSignIn } from "./signup";

const URL = "https://acme.test/api/auth/callback/email?token=abc&email=ada%40example.com";
const request = (email = "ada@example.com") => ({
  email,
  url: URL,
  expires: new Date("2026-10-19T12:15:00Z"),
});

const getDb = setupTestDb();
let db: Db;
beforeEach(() => {
  db = getDb();
});

describe("the magic-link provider (handleLinkRequest)", () => {
  it("sends the link through the Transactional API with no tracking or retention", async () => {
    const { deps, sent } = fakeDeps(db);
    const outcome = await handleLinkRequest(deps, request());

    expect(outcome).toEqual({ delivery: "sent", revealedUrl: null });
    expect(sent()[0]).toMatchObject({
      to: "ada@example.com",
      subject: "Sign in to Acme",
      tracked: false,
      disable_message_retention: true,
    });
    expect(sent()[0]?.body).toContain("expires in 15 minutes");
  });

  it("flips the email state to ready when the send works", async () => {
    const { deps } = fakeDeps(db);
    await handleLinkRequest(deps, request());
    expect(await readEmailStatus(db)).toMatchObject({ state: "ready", reason: null });
  });

  it("records the blocking step when the workspace cannot send yet", async () => {
    const { deps, app } = fakeDeps(db);
    app.sendEmail.mockRejectedValueOnce(edgeError(403, NOT_APPROVED));

    const outcome = await handleLinkRequest(deps, request());
    expect(outcome.delivery).toBe("waiting");
    expect(await readEmailStatus(db)).toMatchObject({
      state: "blocked",
      reason: "account_not_approved",
      httpStatus: 403,
    });
  });

  it("records a new person as a lead: identify with email_verified false, then signup_started", async () => {
    const { deps, track, flush } = fakeDeps(db);
    await handleLinkRequest(deps, request());
    await flush();

    const userId = track.identify.mock.calls[0]?.[0] as string;
    expect(userId).toMatch(/^[0-9a-f-]{36}$/);
    expect(track.identify).toHaveBeenCalledWith(userId, {
      email: "ada@example.com",
      email_verified: false,
    });
    expect(track.track).toHaveBeenCalledWith(userId, { name: "signup_started", data: {} });

    const signup = await readSignup(db, userId);
    expect(signup?.signedUpAt).toBeNull();
    expect(signup?.steps).toMatchObject({
      identify_lead: { status: "done" },
      signup_started: { status: "done" },
    });
  });

  it("records the lead even when email cannot send yet", async () => {
    const { deps, app, track, flush } = fakeDeps(db);
    app.sendEmail.mockRejectedValueOnce(edgeError(403, NOT_APPROVED));
    await handleLinkRequest(deps, request());
    await flush();
    expect(track.track).toHaveBeenCalledWith(expect.any(String), {
      name: "signup_started",
      data: {},
    });
  });

  it("uses the same user ID for the lead and, later, the signup", async () => {
    const { deps, track, flush } = fakeDeps(db);
    await handleLinkRequest(deps, request());
    await flush();
    const leadId = track.identify.mock.calls[0]?.[0] as string;

    await handleSignIn(deps, { id: leadId, email: "ada@example.com" });
    await flush();
    expect(track.track).toHaveBeenLastCalledWith(leadId, {
      name: "signed_up",
      data: { method: "email" },
    });
  });

  it("does not send signup_started again for someone who already signed up", async () => {
    const { deps, track, flush } = fakeDeps(db);
    await handleLinkRequest(deps, request());
    await flush();
    const id = track.identify.mock.calls[0]?.[0] as string;
    await db.execute(`update users set email_verified = now() where id = '${id}'`);
    track.track.mockClear();

    await handleLinkRequest(deps, request());
    await flush();
    expect(track.track).not.toHaveBeenCalled();
  });

  it("sends a designed message with the link in message_data when its ID is set", async () => {
    const { deps, sent } = fakeDeps(db, { ...FULL_ENV, CUSTOMERIO_MAGIC_LINK_MESSAGE_ID: "12" });
    await handleLinkRequest(deps, request());
    expect(sent()[0]).toMatchObject({
      transactional_message_id: "12",
      message_data: { url: URL, app_name: "Acme", expires_in_minutes: 15 },
    });
  });

  it("works with no Customer.io keys at all: nothing is sent, nothing throws", async () => {
    const { deps } = fakeDeps(db, {});
    expect(await handleLinkRequest(deps, request())).toEqual({
      delivery: "not_configured",
      revealedUrl: null,
    });
    expect(await readEmailStatus(db)).toBeNull();
  });
});

describe("showing the link before email works", () => {
  it("prints the link to the terminal in local dev", async () => {
    const { deps } = fakeDeps(db, {}, { isDev: true, vercelEnv: null });
    const outcome = await handleLinkRequest(deps, request());
    expect(outcome.revealedUrl).toBeNull();
    expect(deps.log.info).toHaveBeenCalledWith(expect.stringContaining(URL));
  });

  it("shows it on a Preview deployment while email cannot send", async () => {
    const { deps, app } = fakeDeps(db, FULL_ENV, { vercelEnv: "preview" });
    app.sendEmail.mockRejectedValueOnce(edgeError(403, NOT_APPROVED));
    expect((await handleLinkRequest(deps, request())).revealedUrl).toBe(URL);
  });

  it("never shows it in Production", async () => {
    const { deps, app } = fakeDeps(db, FULL_ENV, { vercelEnv: "production" });
    app.sendEmail.mockRejectedValueOnce(edgeError(403, NOT_APPROVED));
    expect((await handleLinkRequest(deps, request())).revealedUrl).toBeNull();
    expect(deps.log.info).not.toHaveBeenCalled();
  });

  it("does not show it on Preview once the email went out", async () => {
    const { deps } = fakeDeps(db, FULL_ENV, { vercelEnv: "preview" });
    expect((await handleLinkRequest(deps, request())).revealedUrl).toBeNull();
  });

  it("on Preview with OWNER_EMAIL set, shows it only to the owner", async () => {
    const env = { ...FULL_ENV, OWNER_EMAIL: "Owner@Acme.test" };
    const { deps, app } = fakeDeps(db, env, { vercelEnv: "preview" });
    app.sendEmail.mockRejectedValue(edgeError(403, NOT_APPROVED));
    expect((await handleLinkRequest(deps, request("someone@example.com"))).revealedUrl).toBeNull();
    expect((await handleLinkRequest(deps, request("owner@acme.test"))).revealedUrl).toBe(URL);
  });
});

describe("the owner's sign-in link in the server log", () => {
  const ownerEnv = { ...FULL_ENV, CUSTOMERIO_OWNER_EMAIL: "Owner@Acme.test" };
  const logged = (deps: { log: { warn: unknown; info: unknown } }) =>
    [
      ...(deps.log.warn as { mock: { calls: unknown[][] } }).mock.calls,
      ...(deps.log.info as { mock: { calls: unknown[][] } }).mock.calls,
    ]
      .flat()
      .map(String)
      .filter((line) => line.includes(URL));

  it("logs it for the owner while email can't go out (Production)", async () => {
    const { deps, app } = fakeDeps(db, ownerEnv, { vercelEnv: "production" });
    app.sendEmail.mockRejectedValueOnce(edgeError(403, NOT_APPROVED));
    await handleLinkRequest(deps, request("owner@acme.test"));
    expect(logged(deps)).toEqual([`${OWNER_LINK_LOG_PREFIX} ${URL}`]);
  });

  it("logs it when there is no App API key at all", async () => {
    const env = { CUSTOMERIO_OWNER_EMAIL: "owner@acme.test" };
    const { deps } = fakeDeps(db, env, { vercelEnv: "production" });
    await handleLinkRequest(deps, request("owner@acme.test"));
    expect(logged(deps)).toHaveLength(1);
  });

  it("never logs a link for anyone else", async () => {
    const { deps, app } = fakeDeps(db, ownerEnv, { vercelEnv: "production" });
    app.sendEmail.mockRejectedValue(edgeError(403, NOT_APPROVED));
    await handleLinkRequest(deps, request("someone@example.com"));
    expect(logged(deps)).toEqual([]);
  });

  it("stops once email sends fine", async () => {
    const { deps } = fakeDeps(db, ownerEnv, { vercelEnv: "production" });
    await handleLinkRequest(deps, request("owner@acme.test"));
    expect(logged(deps)).toEqual([]);
  });

  it("prefers OWNER_EMAIL over CUSTOMERIO_OWNER_EMAIL", async () => {
    const env = { ...ownerEnv, OWNER_EMAIL: "me@acme.test" };
    const { deps, app } = fakeDeps(db, env, { vercelEnv: "production" });
    app.sendEmail.mockRejectedValue(edgeError(403, NOT_APPROVED));
    await handleLinkRequest(deps, request("owner@acme.test"));
    expect(logged(deps)).toEqual([]);
    await handleLinkRequest(deps, request("me@acme.test"));
    expect(logged(deps)).toHaveLength(1);
  });

  it("leaves local dev as it was: every link, with the dev prefix, never the owner prefix", async () => {
    const { deps } = fakeDeps(db, {}, { isDev: true, vercelEnv: null });
    await handleLinkRequest(deps, request("someone@example.com"));
    const lines = logged(deps);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("(dev only)");
    expect(lines[0]).not.toContain(OWNER_LINK_LOG_PREFIX);
  });
});
