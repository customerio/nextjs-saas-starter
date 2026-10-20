import { describe, expect, it } from "vitest";

import { readCustomerioConfig } from "@/lib/customerio/config";
import { checklistView } from "@/lib/flows/onboarding";
import { createProject, deleteProject, inviteTeammate } from "@/lib/flows/projects";
import { fakeDeps, FULL_ENV } from "@/tests/fakes";

import {
  customerioEnv,
  DEMO_MAX_PROJECTS,
  DEMO_NAME_MAX_LENGTH,
  demoCookieOptions,
  demoSession,
  demoSignInRefusal,
  demoStore,
  isDemo,
  noDatabase,
  readDemoData,
  writeDemoData,
  type DemoData,
} from "./demo";

const NOW = new Date("2026-10-19T12:00:00Z");

/** A demo store whose "cookie" is a string we can read back, like the browser keeps it. */
function cookieStore(initial?: string) {
  let cookie = initial;
  const store = demoStore(readDemoData(cookie), (data) => {
    cookie = writeDemoData(data);
  });
  return { store, cookie: () => cookie, reread: () => readDemoData(cookie) };
}

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

describe("isDemo", () => {
  it("is on only when DEMO_MODE is 1 or true", () => {
    expect(isDemo({ DEMO_MODE: "1" })).toBe(true);
    expect(isDemo({ DEMO_MODE: "true" })).toBe(true);
    expect(isDemo({})).toBe(false);
    expect(isDemo({ DEMO_MODE: "" })).toBe(false);
    expect(isDemo({ DEMO_MODE: "0" })).toBe(false);
  });
});

describe("demo mode sends nothing", () => {
  it("refuses email sign-in, and allows it when demo mode is off", () => {
    expect(demoSignInRefusal({ DEMO_MODE: "1" })).toBe("/sign-in?error=demo");
    expect(demoSignInRefusal({})).toBeNull();
  });

  it("reads an empty Customer.io config, even with keys set", () => {
    const config = readCustomerioConfig(customerioEnv({ ...FULL_ENV, DEMO_MODE: "1" }));
    expect(config.track).toBeNull();
    expect(config.appApiKey).toBeNull();
    expect(config.cdpWriteKey).toBeNull();
    expect(readCustomerioConfig(customerioEnv(FULL_ENV)).track).not.toBeNull();
  });

  it("has no database: any use of it throws", () => {
    expect(() => noDatabase.select()).toThrow("Demo mode has no database.");
  });
});

describe("demoSession", () => {
  it("is the demo user while the cookie is set, for one day", () => {
    expect(demoSession("1", NOW)).toEqual({
      user: { id: "demo", email: "you@demo.acme", name: null },
      expires: "2026-10-20T12:00:00.000Z",
    });
    expect(demoSession(undefined, NOW)).toBeNull();
    expect(demoSession("admin", NOW)).toBeNull();
  });

  it("uses httpOnly, lax, one-day cookies, secure on https", () => {
    expect(demoCookieOptions(true)).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
      maxAge: 86_400,
    });
    expect(demoCookieOptions(false).secure).toBe(false);
  });
});

describe("the demo store", () => {
  it("runs the real project and checklist flows with no database and no Customer.io", async () => {
    const { store, reread } = cookieStore();
    const { deps, flush, track } = fakeDeps(noDatabase, {}, { store });
    const created = await createProject(deps, {
      userId: "demo",
      name: "  Spring   launch ",
      inboxAvailable: false,
    });
    await inviteTeammate(deps, { userId: "demo", email: "lin@example.com", inboxAvailable: false });
    await flush();

    expect(created).toMatchObject({ ok: true, project: { name: "Spring launch" } });
    expect(track.track).not.toHaveBeenCalled();
    const saved = reread();
    expect(saved.projects.map((project) => project.name)).toEqual(["Spring launch"]);
    expect(checklistView(saved.onboarding, { hasProjects: true, inboxAvailable: false })).toEqual(
      expect.objectContaining({ complete: true, doneCount: 2, dismissed: false }),
    );
    expect(saved.onboarding?.completedAt).toEqual(NOW);

    const id = created.ok ? created.project.id : "";
    expect(await deleteProject(deps, { userId: "demo", projectId: id })).toBe(true);
    expect(await deleteProject(deps, { userId: "demo", projectId: id })).toBe(false);
    expect(reread().projects).toEqual([]);
  });

  it("marks each step once and keeps the first dismiss time", async () => {
    const { store, reread } = cookieStore();
    expect(await store.markStep("demo", "open_inbox", NOW)).toBe(true);
    expect(await store.markStep("demo", "open_inbox", new Date(0))).toBe(false);
    await store.dismissOnboarding("demo", NOW);
    await store.dismissOnboarding("demo", new Date(NOW.getTime() + 1000));
    expect(reread().onboarding).toMatchObject({ openedInboxAt: NOW, dismissedAt: NOW });
  });

  it("keeps the cookie small: the newest projects only, and short names", async () => {
    const { store, cookie, reread } = cookieStore();
    for (let i = 0; i < DEMO_MAX_PROJECTS + 3; i++) {
      await store.insertProject("demo", `${"🚀".repeat(60)} ${i}`, new Date(NOW.getTime() + i));
    }
    const { projects } = reread();
    expect(projects).toHaveLength(DEMO_MAX_PROJECTS);
    expect(projects[0]?.createdAt).toEqual(new Date(NOW.getTime() + DEMO_MAX_PROJECTS + 2));
    expect(Array.from(projects[0]?.name ?? "")).toHaveLength(DEMO_NAME_MAX_LENGTH);
    expect(cookie()!.length).toBeLessThan(3500);
  });
});

describe("readDemoData", () => {
  it("reads what writeDemoData wrote", () => {
    const data: DemoData = {
      projects: [{ id: "a-1", name: "Team handbook", createdAt: NOW }],
      onboarding: {
        createdProjectAt: NOW,
        openedInboxAt: null,
        invitedTeammateAt: null,
        completedAt: null,
        dismissedAt: null,
      },
    };
    expect(readDemoData(writeDemoData(data))).toEqual(data);
  });

  it("drops anything a visitor changed by hand", () => {
    const empty = { projects: [], onboarding: null };
    expect(readDemoData(undefined)).toEqual(empty);
    expect(readDemoData("not base64 json")).toEqual(empty);
    expect(readDemoData(encode([1, 2]))).toEqual(empty);
    expect(readDemoData("x".repeat(5000))).toEqual(empty);

    const data = readDemoData(
      encode({
        p: [
          ["ok", "Fine", NOW.getTime()],
          ["<script>", "Bad id", NOW.getTime()],
          ["no-date", "No date", "yesterday"],
          ["blank", "   ", NOW.getTime()],
          { id: "obj", name: "Wrong shape" },
          ...Array.from({ length: 20 }, (_, i) => [`extra-${i}`, "More", NOW.getTime()]),
        ],
        o: { createdProjectAt: "soon", completedAt: NOW.getTime(), admin: true },
      }),
    );
    expect(data.projects[0]).toEqual({ id: "ok", name: "Fine", createdAt: NOW });
    expect(data.projects.map((project) => project.id)).not.toContain("<script>");
    expect(data.projects.length).toBeLessThanOrEqual(DEMO_MAX_PROJECTS);
    expect(data.onboarding).toEqual({
      createdProjectAt: null,
      openedInboxAt: null,
      invitedTeammateAt: null,
      completedAt: NOW,
      dismissedAt: null,
    });
  });
});
