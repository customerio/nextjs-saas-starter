import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OwnerLogsHint } from "@/components/owner-logs-hint";
import { AuthShell } from "@/components/site-chrome";
import { emailNotWorking } from "@/lib/customerio/readiness";
import { isDemo } from "@/lib/demo";
import { visitorNotice } from "@/lib/flows/owner";
import { loadReadiness } from "@/lib/readiness-server";
import { getSession } from "@/lib/session";

import { TryDemo } from "../demo/try-demo";
import { LinkForm } from "./link-form";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  rate_limited: "Too many links in a row. Wait 15 minutes, or use the newest one in your inbox.",
  Verification: "That link has expired or was already used. Ask for a new one below.",
  AccessDenied: "That sign-in wasn’t allowed. Ask for a new link below.",
  Configuration: "Sign-in isn’t set up correctly on this site.",
  demo: "This demo doesn’t send sign-in emails. Use Try the demo instead.",
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  const { error } = await searchParams;
  const message =
    typeof error === "string" ? (ERRORS[error] ?? "Sign-in didn’t work. Try again.") : null;
  const isDev = process.env.NODE_ENV === "development";
  const readiness = await loadReadiness();
  const notice = visitorNotice(readiness, isDev);
  // Only while email can't go out, and the same for every visitor: it never
  // says whether a typed email is the owner's.
  const showOwnerHint = !isDev && emailNotWorking(readiness);
  const demo = isDemo();

  return (
    <AuthShell>
      <h1 className="mt-8 text-[1.625rem] leading-tight font-semibold tracking-[-0.01em]">
        Sign in to Acme
      </h1>
      <p className="mt-2 text-muted">
        {demo
          ? "Look around with a demo account. No email needed."
          : "We’ll email you a link to sign in."}
      </p>

      {message ? (
        <p role="alert" className="mt-6 flex items-start gap-2 text-sm leading-5 text-danger">
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
            fill="currentColor"
          >
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 4.5h1.5v4.25h-1.5V4.5Zm0 5.75h1.5v1.5h-1.5v-1.5Z" />
          </svg>
          {message}
        </p>
      ) : null}

      <div className="mt-8">
        {demo ? (
          <TryDemo />
        ) : (
          <>
            <LinkForm autoFocus notice={notice} />
            {showOwnerHint ? <OwnerLogsHint className="mt-1 ps-3.5" /> : null}
          </>
        )}
      </div>
    </AuthShell>
  );
}
