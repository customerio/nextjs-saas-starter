import type { ReactNode } from "react";
import Link from "next/link";

import { ButtonLink } from "@/components/button";
import { ProductPreview } from "@/components/marketing/product-preview";
import { MarketingHeader, PoweredBy } from "@/components/site-chrome";
import { AcmeMark } from "@/components/logo";
import { visitorNotice } from "@/lib/flows/owner";
import { loadReadiness } from "@/lib/readiness-server";
import { getSession } from "@/lib/session";

import { LinkForm } from "./sign-in/link-form";

const iconProps = {
  viewBox: "0 0 20 20",
  "aria-hidden": true,
  className: "size-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "Sign in with your email",
    body: "No password to make up or forget. We send a link, you open it, and you’re in.",
    icon: (
      <svg {...iconProps}>
        <rect x="2.75" y="4.75" width="14.5" height="10.5" rx="2" />
        <path d="m3.5 6 6.5 4.75L16.5 6" />
      </svg>
    ),
  },
  {
    title: "A welcome that helps",
    body: "Your account starts with a welcome email and a short list of first steps.",
    icon: (
      <svg {...iconProps}>
        <circle cx="10" cy="10" r="7" />
        <path d="m7 10.2 2 2 4-4.4" />
      </svg>
    ),
  },
  {
    title: "News inside the app",
    body: "Updates and tips show up in your inbox, right under the bell.",
    icon: (
      <svg {...iconProps}>
        <path d="M5 8a5 5 0 0 1 10 0v3.2l1.3 2.3a.6.6 0 0 1-.5.9H4.2a.6.6 0 0 1-.5-.9L5 11.2V8Z" />
        <path d="M8 16.5a2 2 0 0 0 4 0" />
      </svg>
    ),
  },
];

export default async function Home() {
  const session = await getSession();
  const notice = session
    ? null
    : visitorNotice(await loadReadiness(), process.env.NODE_ENV === "development");

  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader
        nav={
          <a
            href="#features"
            className="hidden min-h-11 items-center rounded-[10px] px-3 text-[0.9375rem] text-muted transition-colors duration-150 hover:text-ink sm:inline-flex"
          >
            Features
          </a>
        }
      >
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

      <main id="main" className="flex-1">
        <section className="mx-auto flex max-w-6xl flex-col items-center px-5 pt-12 text-center sm:px-8 sm:pt-20 lg:pt-24">
          <h1 className="max-w-[16ch] text-display font-semibold">Acme, ready when you are</h1>
          <p className="mt-5 max-w-[32rem] text-lg leading-8 text-muted">
            Create your account with just your email. You’ll be set up in a minute, and we’ll help
            you with the first steps.
          </p>
          <div className="mt-9 w-full max-w-[28rem] text-start">
            {session ? (
              <div className="flex justify-center">
                <ButtonLink href="/dashboard" className="h-12 rounded-xl px-5">
                  Go to your dashboard
                </ButtonLink>
              </div>
            ) : (
              <LinkForm layout="inline" idPrefix="hero" notice={notice} />
            )}
          </div>
        </section>

        <section
          aria-label="Product preview"
          className="mx-auto mt-12 max-w-5xl px-3 sm:mt-16 sm:px-8"
        >
          {/* Cropped, with a soft fade at the bottom: the page continues below. */}
          <div className="h-[24rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)] sm:h-[32rem]">
            <ProductPreview />
          </div>
        </section>

        <section
          id="features"
          aria-labelledby="features-heading"
          className="mx-auto grid max-w-5xl scroll-mt-6 gap-x-16 gap-y-10 px-5 pt-16 pb-20 sm:px-8 sm:pt-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:pb-28"
        >
          <div>
            <h2 id="features-heading" className="text-title font-semibold">
              Simple from the first click
            </h2>
            <p className="mt-3 max-w-[24rem] text-muted">
              Everything you need to start, and nothing you have to figure out.
            </p>
          </div>
          <ul className="grid gap-8">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="grid grid-cols-[2.5rem_1fr] gap-x-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-surface text-ink shadow-raised">
                  {feature.icon}
                </span>
                <div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="mt-1 max-w-[32rem] text-muted">{feature.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-4 text-[0.8125rem] text-faint">
            <AcmeMark className="size-5" />
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 items-center transition-colors duration-150 hover:text-ink"
            >
              Sign in
            </Link>
            <a
              href="#features"
              className="inline-flex min-h-11 items-center transition-colors duration-150 hover:text-ink"
            >
              Features
            </a>
          </div>
          <PoweredBy />
        </div>
      </footer>
    </div>
  );
}
