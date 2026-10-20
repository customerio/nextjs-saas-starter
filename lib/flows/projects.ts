import { insertProject, removeProject, type ProjectRow } from "@/lib/db/app-store";

import { track } from "./app-events";
import type { FlowDeps } from "./deps";
import { completeStep } from "./onboarding";

export const NAME_MAX_LENGTH = 80;

export type CreateResult =
  { ok: true; project: ProjectRow } | { ok: false; error: "empty" | "too_long" };

/** Creates a row for this user, then tells Customer.io (after the response). */
export async function createProject(
  deps: FlowDeps,
  input: { userId: string; name: string; inboxAvailable: boolean },
): Promise<CreateResult> {
  const name = input.name.replace(/\s+/g, " ").trim();
  if (!name) return { ok: false, error: "empty" };
  if (name.length > NAME_MAX_LENGTH) return { ok: false, error: "too_long" };

  const project = await insertProject(deps.db, input.userId, name, deps.now());
  track(deps, input.userId, "project_created", { project_id: project.id, name: project.name });
  await completeStep(deps, input.userId, "create_project", input.inboxAvailable);
  return { ok: true, project };
}

/** Deletes one of this user's rows. Nothing happens (and nothing is tracked) for anyone else's. */
export async function deleteProject(
  deps: FlowDeps,
  input: { userId: string; projectId: string },
): Promise<boolean> {
  const removed = await removeProject(deps.db, input.userId, input.projectId);
  if (!removed) return false;
  track(deps, input.userId, "project_deleted", { project_id: removed.id, name: removed.name });
  return true;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Records an invite as an event only. The template sends no email to the
 * invitee: build that as a Customer.io campaign on `teammate_invited` (see
 * the README), so you control the copy and the timing.
 */
export async function inviteTeammate(
  deps: FlowDeps,
  input: { userId: string; email: string; inboxAvailable: boolean },
): Promise<{ ok: true } | { ok: false; error: "invalid_email" }> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: "invalid_email" };
  track(deps, input.userId, "teammate_invited", { invitee_email: email });
  await completeStep(deps, input.userId, "invite_teammate", input.inboxAvailable);
  return { ok: true };
}
