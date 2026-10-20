import "server-only";

import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import { DEMO_SESSION_COOKIE, demoSession, isDemo } from "@/lib/demo";

/**
 * The current session, or `null`. Unlike `auth()`, this never throws, so pages
 * that work for signed-out visitors still render when the database or
 * Auth.js is not set up yet.
 */
export async function getSession(): Promise<Session | null> {
  // The demo has no database: its session is a cookie, and Auth.js is not used.
  if (isDemo()) return demoSession((await cookies()).get(DEMO_SESSION_COOKIE)?.value, new Date());
  try {
    return await auth();
  } catch (error) {
    // Let Next.js handle its own control-flow errors (redirects, dynamic rendering).
    unstable_rethrow(error);
    console.error("[auth] could not read the session:", error);
    return null;
  }
}
