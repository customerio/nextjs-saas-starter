import "server-only";

import { getDb } from "@/lib/db";
import { readSignup, type SignupRow } from "@/lib/db/store";
import { isDemo } from "@/lib/demo";

export async function loadSignup(userId: string): Promise<SignupRow | null> {
  // The demo has no database and no signup flow: nothing was sent.
  if (isDemo()) return null;
  try {
    return await readSignup(getDb(), userId);
  } catch (error) {
    console.error("[signup] could not read the signup:", error);
    return null;
  }
}
