import { ButtonLink } from "@/components/button";
import { Rail } from "@/components/rail";
import { MarketingFooter, MarketingHeader } from "@/components/site-chrome";
import { getSession } from "@/lib/session";

import { LinkForm } from "./sign-in/link-form";

const FLOW = [
  {
    key: "ask",
    title: "They ask for a sign-in link",
    body: "No password to make up. Acme saves their address right away, so you know who tried.",
  },
  {
    key: "open",
    title: "They open it",
    body: "Their email is confirmed, and their account exists. That moment is the signup.",
  },
  {
    key: "welcome",
    title: "They hear from you",
    body: "A welcome email arrives within seconds, and you get a note about your new user.",
  },
  {
    key: "inbox",
    title: "They see you in the app",
    body: "Messages and an inbox inside Acme, for news, tips, and anything else worth saying.",
  },
];

export default async function Home() {
  const session = await getSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader>
        {session ? (
          <ButtonLink href="/dashboard" variant="secondary">
            Go to dashboard
          </ButtonLink>
        ) : (
          <ButtonLink href="/sign-in" variant="quiet">
            Sign in
          </ButtonLink>
        )}
      </MarketingHeader>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8">
        <section className="grid items-start gap-x-16 gap-y-10 pt-8 pb-20 sm:pt-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:pt-24 lg:pb-28">
          <div className="lg:pt-6">
            <h1 className="font-display-tight text-display font-semibold">
              Acme is ready for its first customer.
            </h1>
            <p className="mt-6 max-w-[33rem] text-lg leading-8 text-muted">
              Email sign-in, a dashboard, and messages that reach people from their first minute. It
              all works today. Rename it, then build the part only you can build.
            </p>
          </div>

          <div className="rounded-2xl bg-surface p-5 shadow-raised sm:p-7">
            {session ? (
              <div>
                <h2 className="font-display-tight text-xl font-semibold">You’re signed in</h2>
                <p className="mt-1.5 text-muted">Pick up where you left off.</p>
                <ButtonLink href="/dashboard" className="mt-5 min-h-12 w-full">
                  Go to dashboard
                </ButtonLink>
              </div>
            ) : (
              <>
                <h2 className="font-display-tight text-xl font-semibold">Start with your email</h2>
                <p className="mt-1.5 mb-5 text-muted">We’ll send a link that signs you in.</p>
                <LinkForm idPrefix="hero" />
              </>
            )}
          </div>
        </section>

        <section
          aria-labelledby="flow"
          className="grid gap-x-16 gap-y-8 border-t border-line py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:py-20"
        >
          <div>
            <h2 id="flow" className="font-display-tight text-title font-semibold">
              From a stranger to a customer in one minute
            </h2>
            <p className="mt-4 max-w-[28rem] leading-7 text-muted">
              Every step below already happens in Acme. Each one is recorded, so you can build on it
              later.
            </p>
          </div>
          <Rail
            numbered
            steps={FLOW.map((step) => ({
              key: step.key,
              title: step.title,
              state: "neutral" as const,
              children: <p className="max-w-prose text-[0.9375rem] leading-7">{step.body}</p>,
            }))}
          />
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
