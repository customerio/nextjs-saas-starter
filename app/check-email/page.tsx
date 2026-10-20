import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { buttonClass } from "@/components/button";
import { OwnerLogsHint } from "@/components/owner-logs-hint";
import { AuthShell } from "@/components/site-chrome";
import {
  LINK_COOKIE,
  parseLinkRequestCookie,
  type LinkRequestNote,
} from "@/lib/flows/link-request-cookie";
import { showsOwnerLogsHint } from "@/lib/flows/owner";

export const metadata: Metadata = { title: "Check your email" };

function copyFor(note: LinkRequestNote | null, isDev: boolean) {
  const who = note ? <span className="font-medium text-ink">{note.email}</span> : "your inbox";
  switch (note?.delivery) {
    case "sent":
      return {
        title: "Check your email",
        body: <>We sent a sign-in link to {who}. It works once and expires in 15 minutes.</>,
      };
    case "waiting":
      return {
        title: "Sign-in emails aren’t on yet",
        body: <>We saved {who}. Try again soon and your link will arrive.</>,
      };
    case "not_configured":
      return isDev
        ? {
            title: "Your link is in the terminal",
            body: (
              <>
                Email is off in local dev, so the link for {who} is printed where{" "}
                <code className="text-ink">pnpm dev</code> runs.
              </>
            ),
          }
        : { title: "Sign-in emails aren’t on yet", body: <>We saved {who}. Try again soon.</> };
    case "failed":
      return {
        title: "We couldn’t send your link",
        body: <>Something went wrong sending to {who}. Try again in a minute.</>,
      };
    default:
      return {
        title: "Check your email",
        body: <>If that address can sign in, a link is on its way.</>,
      };
  }
}

export default async function CheckEmailPage() {
  const note = parseLinkRequestCookie((await cookies()).get(LINK_COOKIE)?.value);
  const isDev = process.env.NODE_ENV === "development";
  const { title, body } = copyFor(note, isDev);

  return (
    <AuthShell>
      <h1 className="mt-8 text-[1.625rem] leading-tight font-semibold tracking-[-0.01em]">
        {title}
      </h1>
      <p className="mt-2 text-muted">{body}</p>
      {showsOwnerLogsHint(note?.delivery, isDev) ? <OwnerLogsHint className="mt-4" /> : null}

      {note?.revealedUrl ? (
        <section
          aria-labelledby="preview-link"
          className="mt-8 rounded-2xl bg-surface p-5 shadow-raised"
        >
          <h2 id="preview-link" className="text-sm font-medium text-wait">
            Preview only
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Email can’t send yet, so this Preview deployment shows your link here. Production never
            does.
          </p>
          <a
            href={note.revealedUrl}
            className={buttonClass("primary", "mt-4 h-12 w-full rounded-xl")}
          >
            Continue to Acme
          </a>
        </section>
      ) : null}

      <p className="mt-6 text-sm text-muted">
        <Link href="/sign-in" className="inline-flex min-h-11 items-center link">
          Use a different email
        </Link>
      </p>
    </AuthShell>
  );
}
