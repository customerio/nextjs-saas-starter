import type { Session } from "next-auth";

import type { Readiness } from "@/lib/customerio/readiness";
import type { AppStore, OnboardingRow, OnboardingStep, ProjectRow } from "@/lib/db/app-store";
import type { Db } from "@/lib/db/store";

/**
 * Demo mode, for hosting a public demo of this template. Turn it on with
 * DEMO_MODE=1. Keep it off in your own app.
 *
 * The demo runs with no database and sends nothing:
 * - "Try the demo" sets a cookie, and `getSession()` turns it into a demo
 *   session. Auth.js is never called.
 * - The demo's projects and "Get started" progress live in a second cookie,
 *   in that visitor's browser (`demoStore`, the same shape as the database
 *   store).
 * - The Customer.io config is empty (`customerioEnv`), so no call goes out.
 *
 * To remove demo mode: delete this file, lib/demo-server.ts, lib/demo.test.ts,
 * app/demo/, and the `isDemo` checks (search for "demo").
 */

type Env = Record<string, string | undefined>;

export function isDemo(env: Env = process.env): boolean {
  const value = env.DEMO_MODE?.trim().toLowerCase();
  return value === "1" || value === "true";
}

/**
 * The environment the Customer.io config is read from. In demo mode it is
 * empty, so the app makes no Customer.io call at all, even if keys are set.
 */
export function customerioEnv(env: Env = process.env): Env {
  return isDemo(env) ? {} : env;
}

/**
 * Where the Auth.js `signIn` callback sends email sign-in in demo mode, so
 * nobody can ask for a link by posting to /api/auth directly. `null` outside
 * demo mode.
 */
export function demoSignInRefusal(env: Env = process.env): string | null {
  return isDemo(env) ? "/sign-in?error=demo" : null;
}

/**
 * Stands in for the database in demo mode. Any use of it throws, so a code
 * path that still reaches for the database fails loudly in tests.
 */
export const noDatabase = new Proxy(
  {},
  {
    get() {
      throw new Error("Demo mode has no database.");
    },
  },
) as Db;

// --- Session ------------------------------------------------------------------

export const DEMO_SESSION_COOKIE = "acme-demo";
export const DEMO_DATA_COOKIE = "acme-demo-data";
const DAY_SECONDS = 24 * 60 * 60;

/** Both demo cookies: httpOnly, one day, secure on https. */
export function demoCookieOptions(secure: boolean) {
  return { httpOnly: true, sameSite: "lax" as const, path: "/", secure, maxAge: DAY_SECONDS };
}

/** The one demo user. Not a real address: nothing is ever sent to it. */
export const DEMO_USER = { id: "demo", email: "you@demo.acme", name: null };

/** The demo session for this cookie value, or `null` when the cookie is missing. */
export function demoSession(cookieValue: string | undefined, now: Date): Session | null {
  if (cookieValue !== "1") return null;
  return {
    user: { ...DEMO_USER },
    expires: new Date(now.getTime() + DAY_SECONDS * 1000).toISOString(),
  };
}

/**
 * What the status page shows in the demo: a new workspace at its first
 * setup step, so visitors see the checklist. Nothing was really checked.
 */
export function demoReadiness(now: Date): Readiness {
  return {
    kind: "blocked",
    reason: "owner_email_unconfirmed",
    message: null,
    httpStatus: 403,
    checkedAt: now,
  };
}

// --- Data, in a cookie ----------------------------------------------------------

/** Kept small so the cookie stays far under the 4 KB limit. */
export const DEMO_MAX_PROJECTS = 10;
export const DEMO_NAME_MAX_LENGTH = 40;

export interface DemoData {
  /** Newest first. */
  projects: ProjectRow[];
  onboarding: OnboardingRow | null;
}

const ONBOARDING_FIELDS = [
  "createdProjectAt",
  "openedInboxAt",
  "invitedTeammateAt",
  "completedAt",
  "dismissedAt",
] as const;

const STEP_FIELD = {
  create_project: "createdProjectAt",
  open_inbox: "openedInboxAt",
  invite_teammate: "invitedTeammateAt",
} as const;

const cleanName = (name: string) =>
  Array.from(name.replace(/\s+/g, " ").trim()).slice(0, DEMO_NAME_MAX_LENGTH).join("");

const time = (value: unknown): Date | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? new Date(value) : null;

/**
 * Reads the data cookie. The visitor can change it, so everything is checked
 * and anything odd is dropped. That only ever affects their own demo.
 */
export function readDemoData(cookieValue: string | undefined): DemoData {
  const empty: DemoData = { projects: [], onboarding: null };
  if (!cookieValue || cookieValue.length > 4096) return empty;
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(cookieValue, "base64url").toString("utf8"));
  } catch {
    return empty;
  }
  if (typeof raw !== "object" || raw === null) return empty;
  const { p, o } = raw as { p?: unknown; o?: unknown };

  const projects: ProjectRow[] = [];
  for (const item of Array.isArray(p) ? p.slice(0, DEMO_MAX_PROJECTS) : []) {
    if (!Array.isArray(item)) continue;
    const [id, name, createdAt] = item as unknown[];
    const at = time(createdAt);
    if (typeof id !== "string" || !/^[\w-]{1,40}$/.test(id) || typeof name !== "string" || !at)
      continue;
    const clean = cleanName(name);
    if (clean) projects.push({ id, name: clean, createdAt: at });
  }

  let onboarding: OnboardingRow | null = null;
  if (typeof o === "object" && o !== null) {
    const fields = o as Record<string, unknown>;
    onboarding = Object.fromEntries(
      ONBOARDING_FIELDS.map((field) => [field, time(fields[field])]),
    ) as unknown as OnboardingRow;
  }
  return { projects, onboarding };
}

/** The data cookie's value: compact JSON, base64url so any name is cookie-safe. */
export function writeDemoData(data: DemoData): string {
  const o = data.onboarding
    ? Object.fromEntries(
        ONBOARDING_FIELDS.flatMap((field) => {
          const value = data.onboarding?.[field];
          return value ? [[field, value.getTime()]] : [];
        }),
      )
    : undefined;
  const p = data.projects.map((project) => [project.id, project.name, project.createdAt.getTime()]);
  return Buffer.from(JSON.stringify({ p, o }), "utf8").toString("base64url");
}

/**
 * The app's data store for one demo visitor, the same shape as the database
 * one (`dbAppStore`). `save` gets the new data after every change.
 */
export function demoStore(data: DemoData, save: (data: DemoData) => void): AppStore {
  const onboarding = (): OnboardingRow =>
    (data.onboarding ??= {
      createdProjectAt: null,
      openedInboxAt: null,
      invitedTeammateAt: null,
      completedAt: null,
      dismissedAt: null,
    });

  return {
    async listProjects() {
      return [...data.projects];
    },
    async insertProject(_userId, name, now) {
      const project = { id: crypto.randomUUID(), name: cleanName(name), createdAt: now };
      // The oldest one drops off, so the cookie stays small.
      data.projects = [project, ...data.projects].slice(0, DEMO_MAX_PROJECTS);
      save(data);
      return project;
    },
    async removeProject(_userId, id) {
      const project = data.projects.find((item) => item.id === id) ?? null;
      if (!project) return null;
      data.projects = data.projects.filter((item) => item.id !== id);
      save(data);
      return project;
    },
    async readOnboarding() {
      return data.onboarding ? { ...data.onboarding } : null;
    },
    async markStep(_userId, step: OnboardingStep, now) {
      const row = onboarding();
      if (row[STEP_FIELD[step]]) return false;
      row[STEP_FIELD[step]] = now;
      save(data);
      return true;
    },
    async markComplete(_userId, steps, now) {
      const row = onboarding();
      if (row.completedAt || !steps.every((step) => row[STEP_FIELD[step]])) return false;
      row.completedAt = now;
      save(data);
      return true;
    },
    async dismissOnboarding(_userId, now) {
      const row = onboarding();
      row.dismissedAt ??= now;
      save(data);
    },
  };
}
