import "server-only";

import { cookies } from "next/headers";

import type { SignupReport, StepResult } from "@/lib/customerio";

/**
 * Remembers what we sent to Customer.io for the person in this browser, so the
 * dashboard can show it and so we only send `signed_up` once.
 *
 * This starter has no database, so a cookie holds it. It is not proof that
 * someone is new: a person who signs in on a second browser looks new again.
 * When you add a database, store this with the user, and use Auth.js'
 * `isNewUser` (it is set when you use a database adapter).
 */

const COOKIE_NAME = "cio-starter-signup";
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60; // The longest browsers allow.

export interface SignupRecord {
  v: 1;
  personId: string;
  region: "us" | "eu";
  signedUpAt: string;
  report: SignupReport;
}

const STATUSES = new Set(["done", "skipped", "failed"]);

function isStep(value: unknown): value is StepResult {
  return (
    typeof value === "object" &&
    value !== null &&
    STATUSES.has((value as { status?: unknown }).status as string)
  );
}

/** The cookie comes from the browser, so check its shape before using it. */
export function parseSignupRecord(raw: string | undefined): SignupRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SignupRecord>;
    const report = value.report as Partial<SignupReport> | undefined;
    if (
      value.v !== 1 ||
      typeof value.personId !== "string" ||
      typeof value.signedUpAt !== "string" ||
      (value.region !== "us" && value.region !== "eu") ||
      !report ||
      !isStep(report.identify) ||
      !isStep(report.event) ||
      !isStep(report.email)
    ) {
      return null;
    }
    return value as SignupRecord;
  } catch {
    return null;
  }
}

export async function readSignupRecord(personId: string): Promise<SignupRecord | null> {
  const record = parseSignupRecord((await cookies()).get(COOKIE_NAME)?.value);
  return record?.personId === personId ? record : null;
}

export async function saveSignupRecord(record: SignupRecord): Promise<void> {
  (await cookies()).set(COOKIE_NAME, JSON.stringify(record), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}
