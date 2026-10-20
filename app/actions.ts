"use server";

import { revalidatePath } from "next/cache";

import { isEmailSetupFailure } from "@/lib/customerio/errors";
import { readEmailStatus } from "@/lib/db/store";
import { defaultDeps } from "@/lib/flows/default-deps";
import { checkEmailAgain } from "@/lib/flows/signup";
import { getSession } from "@/lib/session";

export type CheckAgainState =
  | { status: "idle" }
  | { status: "ready" }
  | { status: "still_blocked" }
  | { status: "error"; message: string }
  | { status: "too_soon" }
  | { status: "no_recipient" };

/** "Check again" on the email setup panel. See `checkEmailAgain` for what it sends. */
export async function checkAgainAction(): Promise<CheckAgainState> {
  const deps = defaultDeps();
  const session = await getSession();
  const user = session?.user;
  const stored = await readEmailStatus(deps.db);

  const outcome = await checkEmailAgain(deps, {
    signedInUser: user?.id && user.email ? { id: user.id, email: user.email } : null,
    lastCheckedAt: stored?.checkedAt ?? null,
  });
  revalidatePath("/", "layout");

  if (outcome.status !== "checked") return { status: outcome.status };
  const { result } = outcome;
  if (result.status === "done") return { status: "ready" };
  if (result.status === "failed" && isEmailSetupFailure(result.failure))
    return { status: "still_blocked" };
  if (result.status === "skipped")
    return { status: "error", message: "CUSTOMERIO_APP_API_KEY is not set here." };
  return { status: "error", message: result.failure.message };
}
