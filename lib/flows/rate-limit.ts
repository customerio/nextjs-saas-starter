import { createHash } from "node:crypto";

import { pruneHits, recordHits, type Db } from "@/lib/db/store";

/**
 * Limits on sign-in link requests, so the form cannot be used to flood an
 * inbox or burn through your sending reputation. Stored in Postgres, so the
 * limits hold across every server instance.
 */
export const LINK_LIMITS = {
  /** Links per email address. */
  email: { max: 3, windowMinutes: 15 },
  /** Links per IP address (an office or a phone network can share one). */
  ip: { max: 10, windowMinutes: 15 },
} as const;

const WINDOW_MS = 15 * 60_000;

/** We keep hashes, not raw emails or IPs, in the rate limit table. */
function bucket(kind: "email" | "ip", value: string): string {
  return `${kind}:${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;
}

export type RateLimitDecision = { allowed: true } | { allowed: false; limitedBy: "email" | "ip" };

export async function checkLinkRequest(
  db: Db,
  input: { email: string; ip: string | null },
  now: Date,
  random: () => number = Math.random,
): Promise<RateLimitDecision> {
  const emailBucket = bucket("email", input.email);
  const ipBucket = input.ip ? bucket("ip", input.ip) : null;
  const buckets = ipBucket ? [emailBucket, ipBucket] : [emailBucket];

  const counts = await recordHits(db, buckets, now, new Date(now.getTime() - WINDOW_MS));

  // Now and then, drop rows older than a day so the table stays small.
  if (random() < 0.02) await pruneHits(db, new Date(now.getTime() - 86_400_000));

  if ((counts[emailBucket] ?? 0) > LINK_LIMITS.email.max)
    return { allowed: false, limitedBy: "email" };
  if (ipBucket && (counts[ipBucket] ?? 0) > LINK_LIMITS.ip.max)
    return { allowed: false, limitedBy: "ip" };
  return { allowed: true };
}

/** The visitor's IP from the headers Vercel (or any proxy) sets. */
export function clientIp(headers: Headers): string | null {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || null;
}
