import { describe, expect, it } from "vitest";

import { readCustomerioConfig } from "./config";
import {
  emailNotWorking,
  readiness,
  setupChecklist,
  statusAfterSend,
  type StoredEmailStatus,
} from "./readiness";
import type { StepResult } from "./steps";

const config = readCustomerioConfig({ CUSTOMERIO_APP_API_KEY: "app-key" });
const at = new Date("2026-10-19T12:00:00Z");

const failed = (kind: string, status = 403): StepResult => ({
  status: "failed",
  failure: { kind: kind as never, status, message: "from Customer.io" },
});

describe("statusAfterSend", () => {
  it("marks the workspace ready after any successful send", () => {
    expect(statusAfterSend({ status: "done", detail: "d-1" })).toEqual({
      state: "ready",
      reason: null,
      message: null,
      httpStatus: null,
    });
  });

  it.each([
    "owner_email_unconfirmed",
    "account_not_approved",
    "no_from_address",
    "from_domain_unverified",
    "delivery_disabled",
  ])("marks it blocked on %s", (kind) => {
    expect(statusAfterSend(failed(kind))).toMatchObject({
      state: "blocked",
      reason: kind,
      httpStatus: 403,
    });
  });

  it.each(["timeout", "network", "server_error", "unauthorized", "message_not_found"])(
    "leaves the state alone on %s, which says nothing about readiness",
    (kind) => {
      expect(statusAfterSend(failed(kind, 500))).toBeNull();
    },
  );

  it("leaves the state alone when the send was skipped", () => {
    expect(statusAfterSend({ status: "skipped", reason: "missing_app_key" })).toBeNull();
  });
});

describe("readiness", () => {
  const stored = (value: Partial<StoredEmailStatus>): StoredEmailStatus => ({
    state: "blocked",
    reason: "account_not_approved",
    message: "m",
    httpStatus: 403,
    checkedAt: at,
    ...value,
  });

  it("is no_app_key without an App API key, whatever is stored", () => {
    expect(readiness(readCustomerioConfig({}), stored({ state: "ready" })).kind).toBe("no_app_key");
  });

  it("is unknown before the first send", () => {
    expect(readiness(config, null)).toEqual({ kind: "unknown" });
  });

  it("reads ready and blocked rows", () => {
    expect(readiness(config, stored({ state: "ready", reason: null }))).toEqual({
      kind: "ready",
      checkedAt: at,
    });
    expect(readiness(config, stored({}))).toMatchObject({
      kind: "blocked",
      reason: "account_not_approved",
    });
  });

  it("treats a row it does not understand as unknown", () => {
    expect(readiness(config, stored({ reason: "something_new" })).kind).toBe("unknown");
  });

  it("walks the full path: blocked by each check in turn, then ready", () => {
    const states = [
      statusAfterSend(failed("owner_email_unconfirmed")),
      statusAfterSend(failed("account_not_approved")),
      statusAfterSend(failed("from_domain_unverified", 400)),
      statusAfterSend({ status: "done", detail: null }),
    ].map((update) => readiness(config, { ...update!, checkedAt: at }));

    expect(states.map((state) => setupChecklist(state).map((step) => step.state))).toEqual([
      ["current", "waiting", "waiting", "waiting"],
      ["done", "current", "waiting", "waiting"],
      ["done", "done", "current", "waiting"],
      // Test mode can't be seen with a send-only key: never "done".
      ["done", "done", "done", "cant_check"],
    ]);
  });
});

describe("setupChecklist", () => {
  it("is all unknown before anything was sent", () => {
    expect(setupChecklist({ kind: "unknown" }).map((step) => step.state)).toEqual([
      "unknown",
      "unknown",
      "unknown",
      "unknown",
    ]);
  });

  it("lists the checks in Customer.io's order", () => {
    expect(setupChecklist({ kind: "unknown" }).map((step) => step.id)).toEqual([
      "confirm_owner_email",
      "account_approval",
      "sending_domain",
      "test_mode",
    ]);
  });

  it("reads Do Not Send as an account that isn't active, not as a setup step", () => {
    const value = readiness(config, {
      ...statusAfterSend(failed("delivery_disabled"))!,
      checkedAt: at,
    });
    expect(value).toMatchObject({ kind: "suspended" });
    expect(emailNotWorking(value)).toBe(true);
  });

  it("flips from suspended back to ready after one good send", () => {
    const update = statusAfterSend({ status: "done", detail: null })!;
    expect(readiness(config, { ...update, checkedAt: at }).kind).toBe("ready");
  });
});
