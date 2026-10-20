"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/button";

import { requestLink, type LinkFormState } from "./actions";

const inputClass =
  "block h-12 w-full rounded-xl bg-surface px-3.5 text-base text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] transition-shadow duration-150 ease-out placeholder:text-faint hover:shadow-[inset_0_0_0_1px_var(--faint)] focus-visible:shadow-[inset_0_0_0_1px_var(--ink),0_0_0_4px_var(--focus-halo)] focus-visible:outline-none aria-invalid:shadow-[inset_0_0_0_1px_var(--danger),0_0_0_4px_var(--danger-halo)]";

function Spinner() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 animate-spin" fill="none">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      <path
        d="M14.25 8A6.25 6.25 0 0 0 8 1.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The email sign-in form. `inline` puts the button beside the field on wide
 * screens (the landing page); `stacked` is the sign-in page.
 */
export function LinkForm({
  layout = "stacked",
  autoFocus = false,
  notice = null,
  idPrefix = "signin",
}: {
  layout?: "stacked" | "inline";
  autoFocus?: boolean;
  /** One calm line when sign-in emails can't go out yet. Never setup details. */
  notice?: string | null;
  idPrefix?: string;
}) {
  const [state, action, pending] = useActionState<LinkFormState, FormData>(requestLink, {
    error: null,
    email: "",
  });
  const input = useRef<HTMLInputElement>(null);
  const emailId = `${idPrefix}-email`;
  const errorId = `${idPrefix}-error`;
  const noteId = `${idPrefix}-note`;

  // Autofocus only where sign-in is the whole page, and never on touch
  // screens, where it would pop the keyboard open.
  useEffect(() => {
    if (autoFocus && window.matchMedia("(pointer: fine)").matches) input.current?.focus();
  }, [autoFocus]);

  // After an error, put the cursor back in the field so it can be fixed.
  useEffect(() => {
    if (state.error) input.current?.focus();
  }, [state]);

  const inline = layout === "inline";

  return (
    <form action={action} noValidate>
      {/* The hero form sits under a heading that already says what it is for. */}
      <label htmlFor={emailId} className={inline ? "sr-only" : "mb-2 block text-sm font-medium"}>
        Email
      </label>
      <div className={inline ? "flex flex-col gap-2.5 sm:flex-row" : "grid gap-3"}>
        <input
          ref={input}
          id={emailId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          required
          placeholder="you@company.com"
          defaultValue={state.email}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? errorId : notice ? noteId : undefined}
          className={`${inputClass} ${inline ? "sm:flex-1" : ""}`}
        />
        <Button
          type="submit"
          disabled={pending}
          className={`h-12 rounded-xl disabled:bg-primary-hover disabled:text-on-primary ${inline ? "sm:min-w-[12rem] sm:px-5" : "w-full"}`}
        >
          {pending ? (
            <>
              <Spinner />
              Sending link…
            </>
          ) : (
            "Continue with email"
          )}
        </Button>
      </div>

      {/* Honeypot. Hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${idPrefix}-website`}>Website</label>
        <input
          id={`${idPrefix}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div
        aria-live="polite"
        className={`mt-3 min-h-5 text-sm leading-5 ${inline ? "flex justify-center text-center" : ""}`}
      >
        {state.error ? (
          <p id={errorId} className="flex items-start gap-1.5 text-danger">
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
              fill="currentColor"
            >
              <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 4.5h1.5v4.25h-1.5V4.5Zm0 5.75h1.5v1.5h-1.5v-1.5Z" />
            </svg>
            {state.error}
          </p>
        ) : notice ? (
          <p id={noteId} className="flex items-start gap-2 text-muted">
            <span
              aria-hidden="true"
              className="mt-[0.4rem] size-1.5 shrink-0 rounded-full bg-accent"
            />
            {notice}
          </p>
        ) : (
          <p className="text-faint">New to Acme? The same link creates your account.</p>
        )}
      </div>
    </form>
  );
}
