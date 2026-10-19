import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { authSetup } from "@/auth";
import { Button } from "@/components/button";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/session";

import { signInWithGitHub } from "./actions";
import { DemoForm } from "./demo-form";

export const metadata: Metadata = { title: "Sign in" };

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-[1.125rem]" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export default async function SignInPage() {
  if (await getSession()) redirect("/dashboard");
  const { github, demo, hasSecret } = authSetup();
  const missingSecret = !hasSecret && process.env.NODE_ENV === "production";

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[25rem] px-5 pt-10 pb-24 sm:pt-20">
        <h1 className="font-display-wide text-title font-semibold">Sign in or sign up</h1>
        <p className="mt-3 leading-7 text-muted">
          New here? Signing in creates your account. Customer.io hears about it right away.
        </p>

        {missingSecret ? (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-warn-line bg-warn-surface p-4 text-sm leading-6"
          >
            <p className="font-medium text-warn">AUTH_SECRET is not set</p>
            <p className="mt-1 text-ink">
              Sign-in needs it to encrypt sessions. Run{" "}
              <code className="font-mono">npx auth secret</code>, add the value to your Vercel
              project, and redeploy.
            </p>
          </div>
        ) : null}

        <div className="mt-8 grid gap-6">
          {github ? (
            <form action={signInWithGitHub}>
              <Button type="submit" variant={demo ? "secondary" : "primary"} className="w-full">
                <GitHubIcon />
                Continue with GitHub
              </Button>
            </form>
          ) : null}

          {github && demo ? (
            <div className="flex items-center gap-3 text-sm text-faint" aria-hidden="true">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
          ) : null}

          {demo ? (
            <div className="grid gap-4">
              <DemoForm />
              <p className="text-sm leading-6 text-faint">
                Demo sign-in has no password, so anyone can use any email. It is here so you can try
                the starter right away. Turn it off with{" "}
                <code className="font-mono text-[0.8125rem] text-muted">
                  AUTH_DEMO_SIGN_IN=false
                </code>{" "}
                before real people sign up.
              </p>
            </div>
          ) : null}

          {!github && !demo ? (
            <p className="rounded-lg bg-surface p-4 text-sm leading-6 shadow-card">
              No sign-in method is on. Add <code className="font-mono">AUTH_GITHUB_ID</code> and{" "}
              <code className="font-mono">AUTH_GITHUB_SECRET</code>, or remove{" "}
              <code className="font-mono">AUTH_DEMO_SIGN_IN=false</code>.
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
