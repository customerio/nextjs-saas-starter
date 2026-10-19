"use client";

import { useActionState } from "react";

import { Button } from "@/components/button";

import { signInWithDemo, type DemoSignInState } from "./actions";

const initial: DemoSignInState = { error: null, name: "", email: "" };

const inputClass =
  "block min-h-11 w-full rounded-lg bg-surface px-3 text-base text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] transition-shadow duration-150 ease-out placeholder:text-faint hover:shadow-[inset_0_0_0_1px_var(--faint)] focus-visible:shadow-[inset_0_0_0_1px_var(--ink)] aria-invalid:shadow-[inset_0_0_0_1px_var(--danger)] sm:text-[0.9375rem]";

export function DemoForm() {
  const [state, action, pending] = useActionState(signInWithDemo, initial);

  return (
    <form action={action} className="grid gap-4" noValidate>
      <div className="grid gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          defaultValue={state.name}
          maxLength={80}
          className={inputClass}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "email-error" : undefined}
          className={inputClass}
        />
        <div aria-live="polite">
          {state.error ? (
            <p id="email-error" className="flex items-start gap-1.5 text-sm text-danger">
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
      </div>
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Signing in…" : "Continue"}
      </Button>
    </form>
  );
}
