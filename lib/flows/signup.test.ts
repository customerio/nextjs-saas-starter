import { beforeEach, describe, expect, it } from "vitest";

import { findOrCreateUser, readEmailStatus, readSignup, writeEmailStatus } from "@/lib/db/store";
import type { Db } from "@/lib/db/store";
import { edgeError, FULL_ENV, fakeDeps, NOT_APPROVED, NOT_CONFIRMED } from "@/tests/fakes";
import { setupTestDb } from "@/tests/db";

import { checkEmailAgain, handleSignIn } from "./signup";

const getDb = setupTestDb();
let db: Db;
let ada: { id: string; email: string };
beforeEach(async () => {
  db = getDb();
  const row = await findOrCreateUser(db, "ada@example.com");
  ada = { id: row.id, email: row.email };
});

describe("first verified sign-in is the signup", () => {
  it("identifies, tracks signed_up, then sends the welcome email", async () => {
    const { deps, track, sent, flush } = fakeDeps(db);
    expect(await handleSignIn(deps, ada)).toBe(true);
    await flush();

    expect(track.identify).toHaveBeenCalledWith(ada.id, {
      email: "ada@example.com",
      email_verified: true,
      created_at: Math.floor(new Date("2026-10-19T12:00:00Z").getTime() / 1000),
    });
    expect(track.track).toHaveBeenCalledWith(ada.id, {
      name: "signed_up",
      data: { method: "email" },
    });
    expect(sent()).toHaveLength(1);
    expect(sent()[0]).toMatchObject({ to: "ada@example.com", subject: "Welcome to Acme" });

    const signup = await readSignup(db, ada.id);
    expect(signup?.signedUpAt).not.toBeNull();
    expect(signup?.steps).toMatchObject({
      identify: { status: "done" },
      signed_up: { status: "done" },
      welcome_email: { status: "done", detail: "delivery-1" },
      owner_notification: { status: "skipped", reason: "no_owner_email" },
    });
  });

  it("marks each step pending before the background work runs", async () => {
    const { deps } = fakeDeps(db, FULL_ENV, { defer: () => {} });
    await handleSignIn(deps, ada);
    expect((await readSignup(db, ada.id))?.steps).toMatchObject({
      identify: { status: "pending" },
      welcome_email: { status: "pending" },
    });
  });

  it("runs once: a second sign-in, from any browser, sends nothing", async () => {
    const { deps, track, sent, flush } = fakeDeps(db);
    await handleSignIn(deps, ada);
    await flush();
    expect(await handleSignIn(deps, ada)).toBe(false);
    await flush();
    expect(track.track).toHaveBeenCalledTimes(1);
    expect(sent()).toHaveLength(1);
  });

  it("runs once even when two sign-ins arrive at the same moment", async () => {
    const { deps, sent, flush } = fakeDeps(db);
    const results = await Promise.all([
      handleSignIn(deps, ada),
      handleSignIn(deps, ada),
      handleSignIn(deps, ada),
    ]);
    await flush();
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(sent()).toHaveLength(1);
  });

  it("never throws when Customer.io fails, and records each outcome", async () => {
    const { deps, track, app, flush } = fakeDeps(db);
    track.identify.mockRejectedValueOnce(edgeError(401, "Unauthorized request"));
    app.sendEmail.mockRejectedValueOnce(edgeError(403, NOT_CONFIRMED));

    await expect(handleSignIn(deps, ada)).resolves.toBe(true);
    await flush();

    expect(track.track).not.toHaveBeenCalled();
    expect((await readSignup(db, ada.id))?.steps).toMatchObject({
      identify: { status: "failed", failure: { kind: "unauthorized" } },
      signed_up: { status: "skipped", reason: "identify_failed" },
      welcome_email: { status: "failed", failure: { kind: "owner_email_unconfirmed" } },
    });
    expect(await readEmailStatus(db)).toMatchObject({
      state: "blocked",
      reason: "owner_email_unconfirmed",
    });
  });

  it("works with no Customer.io keys: every step is skipped", async () => {
    const { deps, flush } = fakeDeps(db, {});
    await handleSignIn(deps, ada);
    await flush();
    expect((await readSignup(db, ada.id))?.steps).toMatchObject({
      identify: { status: "skipped", reason: "missing_track_keys" },
      welcome_email: { status: "skipped", reason: "missing_app_key" },
    });
  });
});

describe("the owner notification", () => {
  const env = { ...FULL_ENV, OWNER_EMAIL: "owner@acme.test" };

  it("tells the owner about the first signup, then about each next one", async () => {
    const { deps, sent, flush, tick } = fakeDeps(db, env);
    await handleSignIn(deps, ada);
    await flush();
    tick(60_000);
    const grace = await findOrCreateUser(db, "grace@example.com");
    await handleSignIn(deps, { id: grace.id, email: grace.email });
    await flush();

    const toOwner = sent().filter((message) => message.to === "owner@acme.test");
    expect(toOwner.map((message) => message.subject)).toEqual([
      "Acme has its first signup",
      "New signup on Acme",
    ]);
    expect(toOwner[0]?.identifiers).toEqual({ email: "owner@acme.test" });
  });

  it("is skipped when the owner signs up themselves", async () => {
    const { deps, sent, flush } = fakeDeps(db, env);
    const owner = await findOrCreateUser(db, "owner@acme.test");
    await handleSignIn(deps, { id: owner.id, email: owner.email });
    await flush();
    expect(sent().map((message) => message.to)).toEqual(["owner@acme.test"]); // welcome only
    expect((await readSignup(db, owner.id))?.steps).toMatchObject({
      owner_notification: { status: "skipped", reason: "owner_signed_up" },
    });
  });
});

describe("Check again", () => {
  it("sends one test email to OWNER_EMAIL and stores the answer", async () => {
    const { deps, app, sent } = fakeDeps(db, { ...FULL_ENV, OWNER_EMAIL: "owner@acme.test" });
    app.sendEmail.mockRejectedValueOnce(edgeError(403, NOT_APPROVED));

    const result = await checkEmailAgain(deps, { signedInUser: null, lastCheckedAt: null });
    expect(result).toMatchObject({ status: "checked", result: { status: "failed" } });
    expect(sent()[0]).toMatchObject({ to: "owner@acme.test", subject: "Email works for Acme" });
    expect(await readEmailStatus(db)).toMatchObject({
      state: "blocked",
      reason: "account_not_approved",
    });

    await checkEmailAgain(deps, {
      signedInUser: null,
      lastCheckedAt: new Date("2026-10-19T11:00:00Z"),
    });
    expect(await readEmailStatus(db)).toMatchObject({ state: "ready" });
  });

  it("falls back to the signed-in person when OWNER_EMAIL is not set", async () => {
    const { deps, sent } = fakeDeps(db);
    await checkEmailAgain(deps, { signedInUser: ada, lastCheckedAt: null });
    expect(sent()[0]).toMatchObject({ to: "ada@example.com", identifiers: { id: ada.id } });
  });

  it("does nothing without a recipient", async () => {
    const { deps, sent } = fakeDeps(db);
    expect(await checkEmailAgain(deps, { signedInUser: null, lastCheckedAt: null })).toEqual({
      status: "no_recipient",
    });
    expect(sent()).toHaveLength(0);
  });

  it("waits 30 seconds between checks", async () => {
    const { deps, sent } = fakeDeps(db, { ...FULL_ENV, OWNER_EMAIL: "owner@acme.test" });
    await writeEmailStatus(
      db,
      { state: "blocked", reason: "account_not_approved", message: null, httpStatus: 403 },
      deps.now(),
    );
    const result = await checkEmailAgain(deps, {
      signedInUser: null,
      lastCheckedAt: new Date(deps.now().getTime() - 5_000),
    });
    expect(result).toEqual({ status: "too_soon" });
    expect(sent()).toHaveLength(0);
  });
});
