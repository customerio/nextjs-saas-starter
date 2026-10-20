"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/button";
import { site } from "@/lib/site";

import { startDemoAction } from "./actions";

function Submit({ wide }: { wide: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className={`h-12 rounded-xl px-5 disabled:bg-primary-hover disabled:text-on-primary ${wide ? "w-full" : "sm:min-w-[12rem]"}`}
    >
      {pending ? "Opening the demo…" : "Try the demo"}
    </Button>
  );
}

/**
 * Takes the place of the email form in demo mode (DEMO_MODE=1). See
 * lib/demo.ts. `centered` is the landing page; the sign-in page is full width.
 */
export function TryDemo({ centered = false }: { centered?: boolean }) {
  return (
    <form action={startDemoAction} className={centered ? "flex flex-col items-center" : ""}>
      <Submit wide={!centered} />
      <p
        className={`mt-3 text-sm leading-5 text-muted ${centered ? "max-w-[24rem] text-center" : ""}`}
      >
        This is a demo. Deploy your own copy to sign in with email.{" "}
        <a href={`${site.repoUrl}#deploy`} className="link">
          How to deploy
        </a>
      </p>
    </form>
  );
}
