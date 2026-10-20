import { and, count, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { onboarding, projects } from "./schema";
import type { Db } from "./store";

/**
 * Queries for the app's own data: the example resource and the "Get started"
 * checklist. Every query is scoped to one user.
 */

// --- The example resource -----------------------------------------------------

export interface ProjectRow {
  id: string;
  name: string;
  createdAt: Date;
}

const projectColumns = { id: projects.id, name: projects.name, createdAt: projects.createdAt };

export async function listProjects(db: Db, userId: string): Promise<ProjectRow[]> {
  return db
    .select(projectColumns)
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt), desc(projects.id));
}

export async function countProjects(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(projects)
    .where(eq(projects.userId, userId));
  return row?.total ?? 0;
}

export async function insertProject(
  db: Db,
  userId: string,
  name: string,
  now: Date,
): Promise<ProjectRow> {
  const [row] = await db
    .insert(projects)
    .values({ userId, name, createdAt: now })
    .returning(projectColumns);
  if (!row) throw new Error("Insert returned no row.");
  return row;
}

/** Deletes one of this user's rows. Returns it, or null if it was not theirs or already gone. */
export async function removeProject(
  db: Db,
  userId: string,
  id: string,
): Promise<ProjectRow | null> {
  const [row] = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning(projectColumns);
  return row ?? null;
}

// --- The "Get started" checklist ----------------------------------------------

export type OnboardingStep = "create_project" | "open_inbox" | "invite_teammate";

const STEP_FIELD = {
  create_project: "createdProjectAt",
  open_inbox: "openedInboxAt",
  invite_teammate: "invitedTeammateAt",
} as const;

const STEP_COLUMN = {
  create_project: onboarding.createdProjectAt,
  open_inbox: onboarding.openedInboxAt,
  invite_teammate: onboarding.invitedTeammateAt,
} as const;

export interface OnboardingRow {
  createdProjectAt: Date | null;
  openedInboxAt: Date | null;
  invitedTeammateAt: Date | null;
  completedAt: Date | null;
  dismissedAt: Date | null;
}

export async function readOnboarding(db: Db, userId: string): Promise<OnboardingRow | null> {
  const [row] = await db
    .select({
      createdProjectAt: onboarding.createdProjectAt,
      openedInboxAt: onboarding.openedInboxAt,
      invitedTeammateAt: onboarding.invitedTeammateAt,
      completedAt: onboarding.completedAt,
      dismissedAt: onboarding.dismissedAt,
    })
    .from(onboarding)
    .where(eq(onboarding.userId, userId));
  return row ?? null;
}

async function ensureOnboarding(db: Db, userId: string) {
  await db.insert(onboarding).values({ userId }).onConflictDoNothing({ target: onboarding.userId });
}

/** Marks a step done. Returns true only the first time, so its event is tracked once. */
export async function markStep(
  db: Db,
  userId: string,
  step: OnboardingStep,
  now: Date,
): Promise<boolean> {
  await ensureOnboarding(db, userId);
  const column = STEP_COLUMN[step];
  const updated = await db
    .update(onboarding)
    .set({ [STEP_FIELD[step]]: now })
    .where(and(eq(onboarding.userId, userId), isNull(column)))
    .returning({ userId: onboarding.userId });
  return updated.length > 0;
}

/**
 * Marks the checklist complete when every required step is done. Returns true
 * only the first time. `steps` is the list that counts: the inbox step is left
 * out when the browser SDK is off, since nobody could finish it.
 */
export async function markComplete(
  db: Db,
  userId: string,
  steps: readonly OnboardingStep[],
  now: Date,
): Promise<boolean> {
  const updated = await db
    .update(onboarding)
    .set({ completedAt: now })
    .where(
      and(
        eq(onboarding.userId, userId),
        isNull(onboarding.completedAt),
        ...steps.map((step) => isNotNull(STEP_COLUMN[step])),
      ),
    )
    .returning({ userId: onboarding.userId });
  return updated.length > 0;
}

export async function dismissOnboarding(db: Db, userId: string, now: Date): Promise<void> {
  await ensureOnboarding(db, userId);
  await db
    .update(onboarding)
    .set({ dismissedAt: sql`coalesce(${onboarding.dismissedAt}, ${now})` })
    .where(eq(onboarding.userId, userId));
}
