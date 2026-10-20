"use server";

import { revalidatePath } from "next/cache";

import { getCustomerioConfig } from "@/lib/customerio/config";
import { isEmailSetupFailure } from "@/lib/customerio/errors";
import { readEmailStatus } from "@/lib/db/store";
import { isDemo } from "@/lib/demo";
import { defaultDeps } from "@/lib/flows/default-deps";
import { ownerAccess } from "@/lib/flows/owner";
import { checkEmailAgain } from "@/lib/flows/signup";
import { getSession } from "@/lib/session";

export type CheckAgainState =
  | { status: "idle" }
  | { status: "ready" }
  | { status: "still_blocked" }
  | { status: "error"; message: string }
  | { status: "too_soon" }
  | { status: "no_recipient" }
  | { status: "not_allowed" };

/** "Check again" on the status page. Owner only. See `checkEmailAgain` for what it sends. */
export async function checkAgainAction(): Promise<CheckAgainState> {
  if (isDemo()) return { status: "not_allowed" };
  const session = await getSession();
  const user = session?.user;
  const access = ownerAccess({
    ownerEmail: getCustomerioConfig().ownerEmail,
    signedInEmail: user?.email,
    isDev: process.env.NODE_ENV === "development",
  });
  if (access !== "owner" || !user?.id || !user.email) return { status: "not_allowed" };

  const deps = defaultDeps();
  const stored = await readEmailStatus(deps.db);
  const outcome = await checkEmailAgain(deps, {
    signedInUser: { id: user.id, email: user.email },
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
