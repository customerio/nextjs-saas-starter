"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/button";

export function RetryButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Sending…" : "Send the welcome email again"}
    </Button>
  );
}
