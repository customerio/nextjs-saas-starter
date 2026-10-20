"use server";

import { revalidatePath } from "next/cache";

import { browserSdkState } from "@/lib/customerio/browser";
import { getCustomerioConfig } from "@/lib/customerio/config";
import { dismissOnboarding } from "@/lib/db/app-store";
import { defaultDeps } from "@/lib/flows/default-deps";
import { completeStep } from "@/lib/flows/onboarding";
import {
  createProject,
  deleteProject,
  inviteTeammate,
  NAME_MAX_LENGTH,
} from "@/lib/flows/projects";
import { getSession } from "@/lib/session";
import { site } from "@/lib/site";

/**
 * Dashboard actions. Each one checks the session, does the database work,
 * and leaves Customer.io to run after the response (see lib/flows/app-events.ts).
 */

async function currentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

const inboxAvailable = () => browserSdkState(getCustomerioConfig()).enabled;

export type FormState = { status: "idle" | "done" } | { status: "error"; message: string };

export async function createProjectAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await currentUserId();
  if (!userId) return { status: "error", message: "Your session ended. Sign in again." };

  const result = await createProject(defaultDeps(), {
    userId,
    name: String(formData.get("name") ?? ""),
    inboxAvailable: inboxAvailable(),
  });
  if (!result.ok) {
    return {
      status: "error",
      message:
        result.error === "empty"
          ? `Give your ${site.resource.singular} a name.`
          : `Keep the name under ${NAME_MAX_LENGTH} characters.`,
    };
  }
  revalidatePath("/dashboard");
  return { status: "done" };
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await deleteProject(defaultDeps(), { userId, projectId: String(formData.get("id") ?? "") });
  revalidatePath("/dashboard");
}

export async function inviteTeammateAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await currentUserId();
  if (!userId) return { status: "error", message: "Your session ended. Sign in again." };

  const result = await inviteTeammate(defaultDeps(), {
    userId,
    email: String(formData.get("email") ?? ""),
    inboxAvailable: inboxAvailable(),
  });
  if (!result.ok)
    return { status: "error", message: "Enter their full email, like lin@example.com." };
  revalidatePath("/dashboard");
  return { status: "done" };
}

/** Called by the inbox the first time it opens. */
export async function inboxOpenedAction(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await completeStep(defaultDeps(), userId, "open_inbox", inboxAvailable());
  revalidatePath("/dashboard");
}

export async function dismissChecklistAction(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await dismissOnboarding(defaultDeps().db, userId, new Date());
  revalidatePath("/dashboard");
}
