"use client";

import { useActionState } from "react";

import { Button } from "@/components/button";
import type { OnboardingStep } from "@/lib/db/app-store";

import { dismissChecklistAction, inviteTeammateAction, type FormState } from "./actions";
import { OPEN_NEW_PROJECT_EVENT } from "./project-list";

export interface GetStartedProps {
  steps: { id: OnboardingStep; done: boolean }[];
  doneCount: number;
  total: number;
  complete: boolean;
  inboxAvailable: boolean;
  singular: string;
}

function Check() {
  return (
    <span className="flex size-6 items-center justify-center rounded-full bg-ok text-surface">
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="m2.5 6.2 2.3 2.3L9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function StepNumber({ value }: { value: number }) {
  return (
    <span className="flex size-6 items-center justify-center rounded-full font-mono text-xs text-muted tabular-nums shadow-[inset_0_0_0_1px_var(--line-strong)]">
      {value}
    </span>
  );
}

/**
 * Three first steps. Each one, once done, sends `onboarding_step_completed`;
 * all of them send `onboarding_completed`. Build onboarding nudges on those.
 */
export function GetStarted({
  steps,
  doneCount,
  total,
  complete,
  inboxAvailable,
  singular,
}: GetStartedProps) {
  const done = (id: OnboardingStep) => steps.find((step) => step.id === id)?.done ?? false;

  return (
    <section aria-labelledby="get-started" className="rounded-2xl bg-surface shadow-raised">
      <div className="flex items-center justify-between gap-3 py-2 ps-5 pe-2">
        <h2 id="get-started" className="flex items-baseline gap-2 font-medium">
          {complete ? "You’re all set" : "Get started"}
          <span className="text-sm font-normal text-faint tabular-nums">
            {doneCount} of {total}
          </span>
        </h2>
        <form action={dismissChecklistAction}>
          <button
            type="submit"
            aria-label="Hide Get started"
            className="flex size-11 items-center justify-center rounded-[10px] text-faint transition-[background-color,color] duration-150 ease-out hover:bg-sunken hover:text-ink"
          >
            <svg
              viewBox="0 0 12 12"
              aria-hidden="true"
              className="size-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M3 3l6 6M9 3 3 9" strokeLinecap="round" />
            </svg>
          </button>
        </form>
      </div>

      <ol className="grid border-t border-line sm:grid-cols-3">
        <Step index={1} done={done("create_project")} title={`Create your first ${singular}`}>
          {done("create_project") ? (
            "Done. It’s in your list below."
          ) : (
            <>
              <p>Give it a name; you can delete it later.</p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event(OPEN_NEW_PROJECT_EVENT))}
                className="-my-2 mt-0.5 inline-flex min-h-11 items-center link"
              >
                New {singular}
              </button>
            </>
          )}
        </Step>

        <Step index={2} done={done("open_inbox")} title="Check your inbox" muted={!inboxAvailable}>
          {done("open_inbox")
            ? "Done. News and tips will show up there."
            : inboxAvailable
              ? "Open the bell at the top to see news and tips."
              : "The inbox turns on once in-app messages are set up. You can skip this one."}
        </Step>

        <Step index={3} done={done("invite_teammate")} title="Invite a teammate">
          {done("invite_teammate") ? "Invite noted." : <InviteForm />}
        </Step>
      </ol>
    </section>
  );
}

function Step({
  index,
  done,
  title,
  muted = false,
  children,
}: {
  index: number;
  done: boolean;
  title: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:border-e sm:border-b-0 sm:last:border-e-0">
      <span className="pt-px">{done ? <Check /> : <StepNumber value={index} />}</span>
      <div className="min-w-0 flex-1">
        <h3 className={`font-medium ${muted && !done ? "text-muted" : ""}`}>{title}</h3>
        <div className="mt-0.5 text-sm leading-6 text-muted">{children}</div>
      </div>
    </li>
  );
}

function InviteForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(inviteTeammateAction, {
    status: "idle",
  });
  return (
    <form action={action} className="mt-2" noValidate>
      <label htmlFor="invite-email" className="sr-only">
        Teammate’s email
      </label>
      <div className="flex gap-2">
        <input
          id="invite-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          spellCheck={false}
          placeholder="Their email"
          aria-invalid={state.status === "error" ? true : undefined}
          aria-describedby={state.status === "error" ? "invite-error" : undefined}
          className="block h-11 w-full min-w-0 rounded-[10px] bg-canvas px-3 text-base text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] transition-shadow duration-150 ease-out placeholder:text-faint focus-visible:shadow-[inset_0_0_0_1px_var(--ink),0_0_0_4px_var(--focus-halo)] focus-visible:outline-none aria-invalid:shadow-[inset_0_0_0_1px_var(--danger),0_0_0_4px_var(--danger-halo)] sm:h-10 sm:text-sm"
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          className="h-11 min-h-11 shrink-0 px-3 text-sm sm:h-10 sm:min-h-10"
        >
          {pending ? "Inviting…" : "Invite"}
        </Button>
      </div>
      <div aria-live="polite">
        {state.status === "error" ? (
          <p id="invite-error" className="mt-1.5 text-danger">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
