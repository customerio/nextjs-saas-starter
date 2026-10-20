import type { OnboardingRow, OnboardingStep } from "@/lib/db/app-store";

import { track } from "./app-events";
import type { FlowDeps } from "./deps";

/** The steps that count toward "done". The inbox needs the browser SDK. */
export function requiredSteps(inboxAvailable: boolean): OnboardingStep[] {
  return inboxAvailable
    ? ["create_project", "open_inbox", "invite_teammate"]
    : ["create_project", "invite_teammate"];
}

/**
 * Marks a step done and tracks it, once. When that was the last open step,
 * also tracks `onboarding_completed`, once.
 */
export async function completeStep(
  deps: FlowDeps,
  userId: string,
  step: OnboardingStep,
  inboxAvailable: boolean,
): Promise<void> {
  const now = deps.now();
  if (!(await deps.store.markStep(userId, step, now))) return;
  track(deps, userId, "onboarding_step_completed", { step });
  if (await deps.store.markComplete(userId, requiredSteps(inboxAvailable), now)) {
    track(deps, userId, "onboarding_completed");
  }
}

export interface ChecklistView {
  steps: { id: OnboardingStep; done: boolean }[];
  doneCount: number;
  total: number;
  complete: boolean;
  dismissed: boolean;
}

export function checklistView(
  row: OnboardingRow | null,
  input: { hasProjects: boolean; inboxAvailable: boolean },
): ChecklistView {
  const done: Record<OnboardingStep, boolean> = {
    // A project that exists counts, even from before the checklist existed.
    create_project: Boolean(row?.createdProjectAt) || input.hasProjects,
    open_inbox: Boolean(row?.openedInboxAt),
    invite_teammate: Boolean(row?.invitedTeammateAt),
  };
  const required = requiredSteps(input.inboxAvailable);
  const steps = (["create_project", "open_inbox", "invite_teammate"] as const).map((id) => ({
    id,
    done: done[id],
  }));
  const doneCount = required.filter((id) => done[id]).length;
  return {
    steps,
    doneCount,
    total: required.length,
    complete: doneCount === required.length,
    dismissed: Boolean(row?.dismissedAt),
  };
}
