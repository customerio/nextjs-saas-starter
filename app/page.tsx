import { ButtonLink } from "@/components/button";
import { MarketingHeader, PoweredBy } from "@/components/site-chrome";
import { visitorNotice } from "@/lib/flows/owner";
import { loadReadiness } from "@/lib/readiness-server";
import { getSession } from "@/lib/session";

import { LinkForm } from "./sign-in/link-form";

const POINTS = [
  { title: "No passwords", body: "Sign in with a link sent to your inbox." },
  { title: "A warm welcome", body: "New accounts get a welcome email right away." },
  { title: "News in the app", body: "Updates and tips land in your inbox, under the bell." },
];

export default async function Home() {
  const session = await getSession();
  const notice = session
    ? null
    : visitorNotice(await loadReadiness(), process.env.NODE_ENV === "development");

  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader>
        {session ? (
          <ButtonLink href="/dashboard" variant="quiet">
            Dashboard
          </ButtonLink>
        ) : (
          <ButtonLink href="/sign-in" variant="quiet">
            Sign in
          </ButtonLink>
        )}
      </MarketingHeader>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8">
        <section className="mx-auto flex max-w-[38rem] flex-col items-center pt-16 pb-20 text-center sm:pt-28 sm:pb-28">
          <h1 className="text-display font-semibold">Acme is ready for its first customer.</h1>
          <p className="mt-5 max-w-[30rem] text-lg leading-8 text-muted">
            Sign in with your email and hear from the team from your first minute.
          </p>
          <div className="mt-10 w-full max-w-[28rem] text-start">
            {session ? (
              <ButtonLink href="/dashboard" className="h-12 rounded-xl px-5">
                Go to your dashboard
              </ButtonLink>
            ) : (
              <LinkForm layout="inline" idPrefix="hero" notice={notice} />
            )}
          </div>
        </section>

        <section aria-label="What you get" className="border-t border-line py-14">
          <ul className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3 sm:gap-10 sm:text-center">
            {POINTS.map((point) => (
              <li key={point.title}>
                <h2 className="font-medium">{point.title}</h2>
                <p className="mt-1 text-muted">{point.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl justify-end px-5 pb-4 sm:px-8">
        <PoweredBy />
      </footer>
    </div>
  );
}
