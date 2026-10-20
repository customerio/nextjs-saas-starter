import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { buttonClass } from "@/components/button";
import { MarketingFooter, MarketingHeader } from "@/components/site-chrome";
import {
  LINK_COOKIE,
  parseLinkRequestCookie,
  type LinkRequestNote,
} from "@/lib/flows/link-request-cookie";

export const metadata: Metadata = { title: "Check your email" };

function copyFor(note: LinkRequestNote | null, isDev: boolean) {
  const who = note ? <span className="font-medium text-ink">{note.email}</span> : null;
  switch (note?.delivery) {
    case "sent":
      return {
        title: "Check your email",
        body: (
          <>
            We sent a sign-in link to {who}. Open it on this device. It works once and expires in 15
            minutes.
          </>
        ),
      };
    case "waiting":
      return {
        title: "You’re on the list",
        body: (
          <>
            We saved {who}. This site can’t send email yet because its email setup isn’t finished.
            Come back soon and ask for a new link: it will reach your inbox once email is on.
          </>
        ),
      };
    case "not_configured":
      return {
        title: isDev ? "Your link is in the terminal" : "Email is off here",
        body: isDev ? (
          <>
            Email isn’t connected in local dev, so the sign-in link for {who} is printed in the
            terminal that runs <code className="text-ink">pnpm dev</code>. Open it in this browser.
          </>
        ) : (
          <>We saved {who}, but this environment has no email key, so no link was sent.</>
        ),
      };
    case "failed":
      return {
        title: "We couldn’t send your link",
        body: <>Something went wrong while sending to {who}. Try again in a minute.</>,
      };
    default:
      return {
        title: "Check your email",
        body: <>If that address can sign in, a link is on its way. It expires in 15 minutes.</>,
      };
  }
}

export default async function CheckEmailPage() {
  const note = parseLinkRequestCookie((await cookies()).get(LINK_COOKIE)?.value);
  const isDev = process.env.NODE_ENV === "development";
  const { title, body } = copyFor(note, isDev);

  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader />
      <main id="main" className="mx-auto w-full max-w-[34rem] flex-1 px-5 pt-8 pb-20 sm:pt-16">
        <EnvelopeMark waiting={note?.delivery === "waiting" || note?.delivery === "failed"} />
        <h1 className="mt-6 font-display-tight text-title font-semibold">{title}</h1>
        <p className="mt-3 max-w-prose leading-7 text-muted">{body}</p>

        {note?.revealedUrl ? (
          <section
            aria-labelledby="preview-link"
            className="mt-8 rounded-2xl bg-surface p-5 shadow-raised ring-1 ring-wait/40 sm:p-6"
          >
            <p className="inline-flex rounded-md bg-wait-surface px-2 py-0.5 text-sm font-medium text-wait">
              Preview only
            </p>
            <h2 id="preview-link" className="mt-3 font-medium">
              Sign in without the email
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              This is a Vercel Preview deployment and email can’t send yet, so here is the link we
              would have emailed. Production never shows it.
            </p>
            <a href={note.revealedUrl} className={buttonClass("primary", "mt-4")}>
              Continue to Acme
            </a>
          </section>
        ) : null}

        <p className="mt-8 text-sm text-muted">
          Wrong address, or need a new link?{" "}
          <Link href="/sign-in" className="link">
            Start over
          </Link>
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}

function EnvelopeMark({ waiting }: { waiting: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-12 items-center justify-center rounded-2xl bg-surface text-ink shadow-raised"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
        <path d="m4.5 7.5 7.5 5.5 7.5-5.5" strokeLinejoin="round" />
        {waiting ? (
          <circle
            cx="19"
            cy="6"
            r="3.25"
            className="fill-accent stroke-surface"
            strokeWidth="1.5"
          />
        ) : null}
      </svg>
    </span>
  );
}
