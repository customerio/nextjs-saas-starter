"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/button";

import { requestLink, type LinkFormState } from "./actions";

const inputClass =
  "block min-h-12 w-full rounded-[10px] bg-surface px-3.5 text-base text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] transition-shadow duration-150 ease-out placeholder:text-faint hover:shadow-[inset_0_0_0_1px_var(--faint)] focus-visible:shadow-[inset_0_0_0_1.5px_var(--ink)] focus-visible:outline-none aria-invalid:shadow-[inset_0_0_0_1.5px_var(--danger)]";

export function LinkForm({
  autoFocus = false,
  idPrefix = "signin",
}: {
  autoFocus?: boolean;
  idPrefix?: string;
}) {
  const [state, action, pending] = useActionState<LinkFormState, FormData>(requestLink, {
    error: null,
    email: "",
  });
  const input = useRef<HTMLInputElement>(null);
  const emailId = `${idPrefix}-email`;

  // Autofocus only where sign-in is the whole page, and never on touch
  // screens, where it would pop the keyboard open.
  useEffect(() => {
    if (autoFocus && window.matchMedia("(pointer: fine)").matches) input.current?.focus();
  }, [autoFocus]);
  const errorId = `${idPrefix}-error`;

  return (
    <form action={action} className="grid gap-3" noValidate>
      <div className="grid gap-1.5">
        <label htmlFor={emailId} className="text-sm font-medium">
          Work email
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          required
          placeholder="you@company.com"
          defaultValue={state.email}
          ref={input}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? errorId : undefined}
          className={inputClass}
        />
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

      <div aria-live="polite">
        {state.error ? (
          <p id={errorId} className="flex items-start gap-1.5 text-sm leading-5 text-danger">
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
        ) : null}
      </div>

      <Button type="submit" disabled={pending} className="min-h-12 w-full">
        {pending ? "Sending your link…" : "Email me a sign-in link"}
      </Button>
      <p className="text-center text-sm text-faint">
        No password. New here? This creates your account.
      </p>
    </form>
  );
}
