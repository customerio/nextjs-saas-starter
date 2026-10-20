import { and, count, eq, gte, isNull, lt, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { emailStatus, rateLimitHits, schema, signups, users } from "./schema";

/**
 * Every query the app runs outside of Auth.js. Each function takes the
 * database as its first argument, so tests run the same SQL against an
 * in-memory Postgres (PGlite) instead of a mock.
 */

// Works with node-postgres in the app and PGlite in tests.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// --- People -------------------------------------------------------------------

export interface UserRow {
  id: string;
  email: string;
  emailVerified: Date | null;
  createdAt: Date;
}

/**
 * Finds the user for this email, or creates one that is not verified yet.
 *
 * We create the row when someone asks for a sign-in link, not when they
 * click it. That gives them a stable ID from the first moment, so the
 * `signup_started` event and the later `signed_up` event land on the same
 * Customer.io profile. Auth.js finds this row by email when the link is
 * clicked and sets `email_verified`.
 */
export async function findOrCreateUser(db: Db, email: string): Promise<UserRow> {
  await db.insert(users).values({ email }).onConflictDoNothing({ target: users.email });
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.email, email));
  if (!row?.email) throw new Error("User row missing right after insert.");
  return { ...row, email: row.email };
}

// --- Email readiness ------------------------------------------------------------

export interface EmailStatusRow {
  state: "ready" | "blocked";
  reason: string | null;
  message: string | null;
  httpStatus: number | null;
  checkedAt: Date;
}

export async function readEmailStatus(db: Db): Promise<EmailStatusRow | null> {
  const [row] = await db
    .select({
      state: emailStatus.state,
      reason: emailStatus.reason,
      message: emailStatus.message,
      httpStatus: emailStatus.httpStatus,
      checkedAt: emailStatus.checkedAt,
    })
    .from(emailStatus)
    .where(eq(emailStatus.id, 1));
  return row ?? null;
}

export async function writeEmailStatus(
  db: Db,
  value: Omit<EmailStatusRow, "checkedAt">,
  now: Date,
): Promise<void> {
  const row = { ...value, checkedAt: now };
  await db
    .insert(emailStatus)
    .values({ id: 1, ...row })
    .onConflictDoUpdate({ target: emailStatus.id, set: row });
}

export async function clearEmailStatus(db: Db): Promise<void> {
  await db.delete(emailStatus).where(eq(emailStatus.id, 1));
}

// --- Rate limits ----------------------------------------------------------------

/**
 * Records one hit for each bucket, then returns how many hits each bucket has
 * inside the window, this one included. Counting after the insert means two
 * requests at the same moment both see each other.
 */
export async function recordHits(
  db: Db,
  buckets: readonly string[],
  now: Date,
  since: Date,
): Promise<Record<string, number>> {
  if (buckets.length === 0) return {};
  await db.insert(rateLimitHits).values(buckets.map((bucket) => ({ bucket, createdAt: now })));

  const counts: Record<string, number> = {};
  for (const bucket of buckets) {
    const [row] = await db
      .select({ hits: count() })
      .from(rateLimitHits)
      .where(and(eq(rateLimitHits.bucket, bucket), gte(rateLimitHits.createdAt, since)));
    counts[bucket] = row?.hits ?? 0;
  }
  return counts;
}

export async function pruneHits(db: Db, before: Date): Promise<void> {
  await db.delete(rateLimitHits).where(lt(rateLimitHits.createdAt, before));
}

// --- Signups --------------------------------------------------------------------

export interface SignupRow {
  userId: string;
  startedAt: Date;
  signedUpAt: Date | null;
  steps: Record<string, unknown>;
}

/** Makes sure the person has a signups row. Returns true if it is new. */
export async function startSignup(db: Db, userId: string): Promise<boolean> {
  const inserted = await db
    .insert(signups)
    .values({ userId })
    .onConflictDoNothing({ target: signups.userId })
    .returning({ userId: signups.userId });
  return inserted.length > 0;
}

/**
 * Marks the person as signed up, once. Returns true only for the one call
 * that did it; every later call (another browser, a retry) gets false.
 */
export async function claimSignup(db: Db, userId: string, now: Date): Promise<boolean> {
  await startSignup(db, userId);
  const claimed = await db
    .update(signups)
    .set({ signedUpAt: now })
    .where(and(eq(signups.userId, userId), isNull(signups.signedUpAt)))
    .returning({ userId: signups.userId });
  return claimed.length > 0;
}

/** Saves one step's outcome. Merges into the JSON, so steps never overwrite each other. */
export async function saveStep(db: Db, userId: string, step: string, value: unknown) {
  await db
    .update(signups)
    .set({
      steps: sql`${signups.steps} || jsonb_build_object(${step}::text, ${JSON.stringify(value)}::jsonb)`,
    })
    .where(eq(signups.userId, userId));
}

export async function readSignup(db: Db, userId: string): Promise<SignupRow | null> {
  const [row] = await db
    .select({
      userId: signups.userId,
      startedAt: signups.startedAt,
      signedUpAt: signups.signedUpAt,
      steps: signups.steps,
    })
    .from(signups)
    .where(eq(signups.userId, userId));
  return row ?? null;
}

/** How many people signed up before this one, not counting the owner. */
export async function countEarlierSignups(
  db: Db,
  userId: string,
  ownerEmail: string | null,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(signups)
    .innerJoin(users, eq(users.id, signups.userId))
    .where(
      and(
        sql`${signups.signedUpAt} is not null`,
        sql`${signups.userId} <> ${userId}`,
        ownerEmail ? sql`${users.email} <> ${ownerEmail}` : undefined,
      ),
    );
  return row?.total ?? 0;
}
