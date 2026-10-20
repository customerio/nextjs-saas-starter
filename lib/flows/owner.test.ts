import { describe, expect, it } from "vitest";

import { ownerAccess, visitorNotice } from "./owner";

describe("ownerAccess", () => {
  it("lets in only the person whose email is OWNER_EMAIL", () => {
    const ownerEmail = "owner@acme.test";
    expect(ownerAccess({ ownerEmail, signedInEmail: "Owner@Acme.test", isDev: false })).toBe(
      "owner",
    );
    expect(ownerAccess({ ownerEmail, signedInEmail: "ada@example.com", isDev: false })).toBe(
      "not_owner",
    );
    expect(ownerAccess({ ownerEmail, signedInEmail: "ada@example.com", isDev: true })).toBe(
      "not_owner",
    );
  });

  it("without OWNER_EMAIL, lets anyone signed in through in local dev only", () => {
    expect(ownerAccess({ ownerEmail: null, signedInEmail: "ada@example.com", isDev: true })).toBe(
      "owner",
    );
    expect(ownerAccess({ ownerEmail: null, signedInEmail: "ada@example.com", isDev: false })).toBe(
      "no_owner_email",
    );
  });

  it("never lets in someone who is not signed in", () => {
    expect(ownerAccess({ ownerEmail: null, signedInEmail: null, isDev: true })).toBe("not_owner");
  });
});

describe("visitorNotice", () => {
  it("is one calm line while email is blocked, and nothing once it works", () => {
    const blocked = {
      kind: "blocked",
      reason: "account_not_approved",
      message: null,
      httpStatus: 403,
      checkedAt: new Date(),
    } as const;
    expect(visitorNotice(blocked, false)).toMatch(/aren’t on yet/);
    expect(visitorNotice(blocked, false)).not.toMatch(/approv|domain|DNS/i);
    expect(visitorNotice({ kind: "ready", checkedAt: new Date() }, false)).toBeNull();
    expect(visitorNotice({ kind: "unknown" }, false)).toBeNull();
  });

  it("points to the terminal in local dev when there is no App API key", () => {
    expect(visitorNotice({ kind: "no_app_key" }, true)).toMatch(/terminal/);
    expect(visitorNotice({ kind: "no_app_key" }, false)).not.toMatch(/terminal/);
  });
});
