import { beforeEach, describe, expect, it } from "vitest";

import { dismissOnboarding, listProjects, readOnboarding } from "@/lib/db/app-store";
import { findOrCreateUser, type Db } from "@/lib/db/store";
import { edgeError, fakeDeps } from "@/tests/fakes";
import { setupTestDb } from "@/tests/db";

import { checklistView } from "./onboarding";
import { createProject, deleteProject, inviteTeammate } from "./projects";

const getDb = setupTestDb();
let db: Db;
let userId: string;
let otherId: string;
beforeEach(async () => {
  db = getDb();
  userId = (await findOrCreateUser(db, "ada@example.com")).id;
  otherId = (await findOrCreateUser(db, "grace@example.com")).id;
});

const events = (track: ReturnType<typeof fakeDeps>["track"]) =>
  track.track.mock.calls.map(
    ([, event]) => event as { name: string; data: Record<string, unknown> },
  );

describe("creating and deleting the example resource", () => {
  it("saves it for this user and tracks project_created with its id and name", async () => {
    const { deps, track, flush } = fakeDeps(db);
    const result = await createProject(deps, {
      userId,
      name: "  Spring   launch ",
      inboxAvailable: true,
    });
    await flush();

    expect(result).toMatchObject({ ok: true, project: { name: "Spring launch" } });
    expect(await listProjects(db, userId)).toHaveLength(1);
    expect(await listProjects(db, otherId)).toHaveLength(0);
    const id = result.ok ? result.project.id : "";
    expect(track.track).toHaveBeenCalledWith(userId, {
      name: "project_created",
      data: { project_id: id, name: "Spring launch" },
    });
  });

  it("rejects an empty or too-long name without saving or tracking", async () => {
    const { deps, track, flush } = fakeDeps(db);
    expect(await createProject(deps, { userId, name: "   ", inboxAvailable: true })).toEqual({
      ok: false,
      error: "empty",
    });
    expect(
      await createProject(deps, { userId, name: "x".repeat(81), inboxAvailable: true }),
    ).toEqual({
      ok: false,
      error: "too_long",
    });
    await flush();
    expect(await listProjects(db, userId)).toHaveLength(0);
    expect(track.track).not.toHaveBeenCalled();
  });

  it("deletes only the user's own row and tracks project_deleted", async () => {
    const { deps, track, flush } = fakeDeps(db);
    const created = await createProject(deps, {
      userId,
      name: "Team handbook",
      inboxAvailable: true,
    });
    const id = created.ok ? created.project.id : "";
    track.track.mockClear();

    expect(await deleteProject(deps, { userId: otherId, projectId: id })).toBe(false);
    expect(await deleteProject(deps, { userId, projectId: id })).toBe(true);
    expect(await deleteProject(deps, { userId, projectId: id })).toBe(false);
    await flush();

    expect(await listProjects(db, userId)).toHaveLength(0);
    expect(events(track)).toEqual([
      { name: "project_deleted", data: { project_id: id, name: "Team handbook" } },
    ]);
  });

  it("never fails the action when Customer.io fails", async () => {
    const { deps, track, flush } = fakeDeps(db);
    track.track.mockRejectedValue(edgeError(401, "Unauthorized request"));
    const result = await createProject(deps, { userId, name: "Research", inboxAvailable: true });
    await flush();
    expect(result.ok).toBe(true);
    expect(deps.log.warn).toHaveBeenCalled();
  });

  it("works with no Customer.io keys at all", async () => {
    const { deps, flush } = fakeDeps(db, {});
    expect(
      (await createProject(deps, { userId, name: "Research", inboxAvailable: false })).ok,
    ).toBe(true);
    await flush();
  });
});

describe("the Get started checklist", () => {
  it("tracks each step once, then onboarding_completed once", async () => {
    const { deps, track, flush } = fakeDeps(db);
    await createProject(deps, { userId, name: "One", inboxAvailable: true });
    await createProject(deps, { userId, name: "Two", inboxAvailable: true });
    await inviteTeammate(deps, { userId, email: "Lin@Example.com", inboxAvailable: true });
    await inviteTeammate(deps, { userId, email: "sam@example.com", inboxAvailable: true });
    await flush();

    const names = events(track).map((event) => event.name);
    expect(names.filter((name) => name === "onboarding_step_completed")).toHaveLength(2);
    expect(names).not.toContain("onboarding_completed");
    expect(events(track)).toContainEqual({
      name: "teammate_invited",
      data: { invitee_email: "lin@example.com" },
    });
    expect(events(track)).toContainEqual({
      name: "onboarding_step_completed",
      data: { step: "create_project" },
    });

    const { completeStep } = await import("./onboarding");
    await completeStep(deps, userId, "open_inbox", true);
    await completeStep(deps, userId, "open_inbox", true);
    await flush();
    expect(events(track).filter((event) => event.name === "onboarding_completed")).toHaveLength(1);
  });

  it("does not need the inbox step when the browser SDK is off", async () => {
    const { deps, track, flush } = fakeDeps(db);
    await createProject(deps, { userId, name: "One", inboxAvailable: false });
    await inviteTeammate(deps, { userId, email: "lin@example.com", inboxAvailable: false });
    await flush();
    expect(events(track).map((event) => event.name)).toContain("onboarding_completed");
    const view = checklistView(await readOnboarding(db, userId), {
      hasProjects: true,
      inboxAvailable: false,
    });
    expect(view).toMatchObject({ doneCount: 2, total: 2, complete: true });
  });

  it("rejects an invalid invite email without tracking", async () => {
    const { deps, track, flush } = fakeDeps(db);
    expect(await inviteTeammate(deps, { userId, email: "lin", inboxAvailable: true })).toEqual({
      ok: false,
      error: "invalid_email",
    });
    await flush();
    expect(track.track).not.toHaveBeenCalled();
  });

  it("counts an existing project as done, and remembers a dismissal", async () => {
    expect(checklistView(null, { hasProjects: true, inboxAvailable: true })).toMatchObject({
      doneCount: 1,
      total: 3,
      complete: false,
      dismissed: false,
    });
    await dismissOnboarding(db, userId, new Date());
    expect(
      checklistView(await readOnboarding(db, userId), { hasProjects: false, inboxAvailable: true })
        .dismissed,
    ).toBe(true);
  });
});
