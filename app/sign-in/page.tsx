import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmailSetup } from "@/components/email/email-setup";
import { MarketingFooter, MarketingHeader } from "@/components/site-chrome";
import { getCustomerioConfig } from "@/lib/customerio/config";
import { loadReadiness } from "@/lib/readiness-server";
import { getSession } from "@/lib/session";

import { LinkForm } from "./link-form";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  rate_limited:
    "You asked for a few links in a row. Wait 15 minutes, or use the newest link in your inbox.",
  Verification:
    "That sign-in link has expired or was already used. Enter your email for a new one.",
  AccessDenied: "That sign-in wasn’t allowed. Enter your email for a new link.",
  Configuration:
    "Sign-in isn’t set up correctly on this site. If it’s yours, check the server logs.",
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  const { error } = await searchParams;
  const message =
    typeof error === "string" ? (ERRORS[error] ?? "Sign-in didn’t work. Try again.") : null;
  const readiness = await loadReadiness();

  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader />
      <main id="main" className="mx-auto w-full max-w-[34rem] flex-1 px-5 pt-8 pb-20 sm:pt-16">
        <h1 className="font-display-tight text-title font-semibold">Sign in to Acme</h1>
        <p className="mt-2 text-muted">
          We’ll email you a link. It works once and expires in 15 minutes.
        </p>

        {message ? (
          <p
            role="alert"
            className="mt-6 rounded-xl bg-surface px-4 py-3 text-sm leading-6 shadow-raised"
          >
            {message}
          </p>
        ) : null}

        <div className="mt-6 rounded-2xl bg-surface p-5 shadow-raised sm:p-6">
          <LinkForm autoFocus />
        </div>

        <div className="mt-6">
          <EmailSetup
            readiness={readiness}
            config={getCustomerioConfig()}
            audience="visitor"
            signedInEmail={null}
          />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
