"use client";

import { useActionState } from "react";

import { checkAgainAction, type CheckAgainState } from "@/app/actions";
import { Button } from "@/components/button";

const MESSAGES: Record<Exclude<CheckAgainState["status"], "idle">, string> = {
  ready: "Email works now. The test email is on its way.",
  still_blocked: "Not yet. The list above shows the step that is still open.",
  too_soon: "Checked a few seconds ago. Try again in half a minute.",
  no_recipient: "Set OWNER_EMAIL so there is someone to send the test email to.",
  error: "Customer.io did not accept the test email.",
};

/**
 * Sends one test email and shows the answer. While email cannot send, nothing
 * is delivered; once it can, the recipient gets one short "Email works" note.
 */
export function CheckAgain({ recipientHint }: { recipientHint: string }) {
  const [state, action, pending] = useActionState<CheckAgainState>(checkAgainAction, {
    status: "idle",
  });

  return (
    <form action={action} className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Checking…" : "Check again"}
      </Button>
      <p className="min-w-0 flex-1 basis-56 text-sm leading-6 text-muted" aria-live="polite">
        {state.status === "idle"
          ? recipientHint
          : state.status === "error"
            ? `${MESSAGES.error} ${state.message}`
            : MESSAGES[state.status]}
      </p>
    </form>
  );
}
