import { beforeEach, describe, expect, it } from "vitest";

import type { Db } from "@/lib/db/store";
import { setupTestDb } from "@/tests/db";

import { checkLinkRequest, clientIp, LINK_LIMITS } from "./rate-limit";

const getDb = setupTestDb();
let db: Db;
beforeEach(() => {
  db = getDb();
});

const now = new Date("2026-10-19T12:00:00Z");
const later = (minutes: number) => new Date(now.getTime() + minutes * 60_000);
const never = () => 1;

describe("sign-in link rate limit", () => {
  it(`allows ${LINK_LIMITS.email.max} links per email in 15 minutes, then blocks`, async () => {
    const results = [];
    for (let i = 0; i < LINK_LIMITS.email.max + 1; i++) {
      results.push(
        await checkLinkRequest(db, { email: "ada@example.com", ip: `10.0.0.${i}` }, now, never),
      );
    }
    expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
    expect(results.at(-1)).toEqual({ allowed: false, limitedBy: "email" });
  });

  it("counts each email on its own", async () => {
    for (let i = 0; i < LINK_LIMITS.email.max; i++) {
      await checkLinkRequest(db, { email: "ada@example.com", ip: null }, now, never);
    }
    expect(
      await checkLinkRequest(db, { email: "grace@example.com", ip: null }, now, never),
    ).toEqual({ allowed: true });
  });

  it(`allows ${LINK_LIMITS.ip.max} links per IP across emails`, async () => {
    const results = [];
    for (let i = 0; i < LINK_LIMITS.ip.max + 1; i++) {
      results.push(
        await checkLinkRequest(db, { email: `p${i}@example.com`, ip: "203.0.113.9" }, now, never),
      );
    }
    expect(results.at(-2)).toEqual({ allowed: true });
    expect(results.at(-1)).toEqual({ allowed: false, limitedBy: "ip" });
  });

  it("forgets hits once the window has passed", async () => {
    for (let i = 0; i < LINK_LIMITS.email.max + 1; i++) {
      await checkLinkRequest(db, { email: "ada@example.com", ip: null }, now, never);
    }
    expect(
      await checkLinkRequest(db, { email: "ada@example.com", ip: null }, later(16), never),
    ).toEqual({
      allowed: true,
    });
  });

  it("stores hashes, never the raw email or IP", async () => {
    await checkLinkRequest(db, { email: "ada@example.com", ip: "203.0.113.9" }, now, never);
    const rows = await db.execute("select bucket from rate_limit_hits");
    const text = JSON.stringify(rows);
    expect(text).not.toContain("ada@example.com");
    expect(text).not.toContain("203.0.113.9");
  });
});

describe("clientIp", () => {
  it("prefers x-real-ip, then the first x-forwarded-for entry", () => {
    expect(clientIp(new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe(
      "1.1.1.1",
    );
    expect(clientIp(new Headers({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers())).toBeNull();
  });
});
