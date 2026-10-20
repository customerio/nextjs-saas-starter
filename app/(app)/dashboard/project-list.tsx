"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/button";
import { capitalize } from "@/lib/site";

import { createProjectAction, deleteProjectAction, type FormState } from "./actions";

/** Other parts of the page (the Get started checklist) open the form with this event. */
export const OPEN_NEW_PROJECT_EVENT = "acme:new-project";

export interface ProjectItem {
  id: string;
  name: string;
  createdAt: string;
}

const dateFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const inputClass =
  "block h-11 w-full min-w-0 rounded-[10px] bg-surface px-3 text-base text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] transition-shadow duration-150 ease-out placeholder:text-faint focus-visible:shadow-[inset_0_0_0_1px_var(--ink),0_0_0_4px_var(--focus-halo)] focus-visible:outline-none aria-invalid:shadow-[inset_0_0_0_1px_var(--danger),0_0_0_4px_var(--danger-halo)] sm:text-[0.9375rem]";

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
    </svg>
  );
}

export function ProjectList({
  projects,
  singular,
  plural,
}: {
  projects: ProjectItem[];
  singular: string;
  plural: string;
}) {
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const open = () => setCreating(true);
    window.addEventListener(OPEN_NEW_PROJECT_EVENT, open);
    return () => window.removeEventListener(OPEN_NEW_PROJECT_EVENT, open);
  }, []);

  return (
    <section aria-labelledby="projects-heading">
      <div className="flex items-center justify-between gap-4">
        <h2 id="projects-heading" className="flex items-baseline gap-2 font-medium">
          {capitalize(plural)}
          {projects.length > 0 ? (
            <span className="text-sm font-normal text-faint tabular-nums">{projects.length}</span>
          ) : null}
        </h2>
        {projects.length > 0 && !creating ? (
          <Button
            type="button"
            onClick={() => setCreating(true)}
            className="h-11 min-h-11 px-3.5 text-sm sm:h-10 sm:min-h-10"
          >
            <PlusIcon />
            New {singular}
          </Button>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-raised">
        {creating ? <NewProjectForm singular={singular} onDone={() => setCreating(false)} /> : null}

        {projects.length === 0 && !creating ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <EmptyMark />
            <p className="mt-5 font-medium">No {plural} yet</p>
            <p className="mt-1 max-w-[20rem] text-sm leading-6 text-muted">
              Create your first {singular} and it shows up here.
            </p>
            <Button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-5 h-11 min-h-11 px-3.5 text-sm sm:h-10 sm:min-h-10"
            >
              <PlusIcon />
              New {singular}
            </Button>
          </div>
        ) : null}

        {projects.length > 0 ? (
          <ul>
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function NewProjectForm({ singular, onDone }: { singular: string; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createProjectAction, {
    status: "idle",
  });
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  useEffect(() => {
    if (state.status === "done") onDone();
    if (state.status === "error") input.current?.focus();
  }, [state, onDone]);

  return (
    <form
      action={action}
      onKeyDown={(event) => {
        if (event.key === "Escape") onDone();
      }}
      className="border-b border-line p-4 sm:p-5"
      noValidate
    >
      <label htmlFor="new-project-name" className="mb-2 block text-sm font-medium">
        {capitalize(singular)} name
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={input}
          id="new-project-name"
          name="name"
          autoComplete="off"
          maxLength={120}
          placeholder={`My first ${singular}`}
          aria-invalid={state.status === "error" ? true : undefined}
          aria-describedby={state.status === "error" ? "new-project-error" : undefined}
          className={inputClass}
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={pending}
            className="h-11 flex-1 px-4 sm:min-w-[6.5rem] sm:flex-none"
          >
            {pending ? "Creating…" : "Create"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onDone}
            className="h-11 flex-1 px-4 sm:flex-none"
          >
            Cancel
          </Button>
        </div>
      </div>
      <div aria-live="polite">
        {state.status === "error" ? (
          <p id="new-project-error" className="mt-2 text-sm text-danger">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function ProjectRow({ project }: { project: ProjectItem }) {
  const [confirming, setConfirming] = useState(false);
  const created = new Date(project.createdAt);

  return (
    <li className="flex min-h-15 items-center gap-3 border-b border-line px-4 py-2 last:border-b-0 sm:px-5">
      {confirming ? (
        <form
          action={deleteProjectAction}
          className="flex w-full flex-wrap items-center justify-between gap-2"
        >
          <input type="hidden" name="id" value={project.id} />
          <p className="min-w-0 text-sm">
            Delete <span className="font-medium">{project.name}</span>? This can’t be undone.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirming(false)}
              autoFocus
              className="h-11 min-h-11 px-3 text-sm sm:h-10 sm:min-h-10"
            >
              Keep
            </Button>
            <DeleteButton />
          </div>
        </form>
      ) : (
        <>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-sm font-semibold text-muted">
            {project.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium" title={project.name}>
              {project.name}
            </p>
            <p className="text-sm text-faint">
              Created <time dateTime={project.createdAt}>{dateFormat.format(created)}</time>
            </p>
          </div>
          <button
            type="button"
            aria-label={`Delete ${project.name}`}
            onClick={() => setConfirming(true)}
            className="flex size-11 shrink-0 items-center justify-center rounded-[10px] text-faint transition-[background-color,color] duration-150 ease-out hover:bg-sunken hover:text-danger"
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="size-[1.125rem]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.2a1.5 1.5 0 0 0 1.5 1.3h3.6a1.5 1.5 0 0 0 1.5-1.3L14 6" />
            </svg>
          </button>
        </>
      )}
    </li>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center rounded-[10px] bg-danger px-3 text-sm font-medium text-on-primary transition-[opacity,scale] duration-150 ease-out active:scale-[0.96] disabled:opacity-70 sm:h-10"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

function EmptyMark() {
  return (
    <span aria-hidden="true" className="grid grid-cols-2 gap-1.5">
      <span className="size-4 rounded-[5px] bg-sunken" />
      <span className="size-4 rounded-[5px] bg-sunken" />
      <span className="size-4 rounded-[5px] bg-sunken" />
      <span className="size-4 rounded-[5px] shadow-[inset_0_0_0_1.5px_var(--line-strong)]" />
    </span>
  );
}
