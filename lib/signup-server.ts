import "server-only";

import { getDb } from "@/lib/db";
import { readSignup, type SignupRow } from "@/lib/db/store";

export async function loadSignup(userId: string): Promise<SignupRow | null> {
  try {
    return await readSignup(getDb(), userId);
  } catch (error) {
    console.error("[signup] could not read the signup:", error);
    return null;
  }
}
