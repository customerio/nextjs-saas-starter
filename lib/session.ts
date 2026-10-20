import "server-only";

import { unstable_rethrow } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/auth";

/**
 * The current session, or `null`. Unlike `auth()`, this never throws, so pages
 * that work for signed-out visitors still render when the database or
 * Auth.js is not set up yet.
 */
export async function getSession(): Promise<Session | null> {
  try {
    return await auth();
  } catch (error) {
    // Let Next.js handle its own control-flow errors (redirects, dynamic rendering).
    unstable_rethrow(error);
    console.error("[auth] could not read the session:", error);
    return null;
  }
}
