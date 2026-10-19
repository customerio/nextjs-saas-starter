import { authSetup } from "@/auth";
import { ButtonLink } from "@/components/button";
import { SiteHeader } from "@/components/site-header";
import { SignupTrace } from "@/components/signup-trace";
import { getCustomerioConfig, signupEndpoints, SIGNED_UP_EVENT } from "@/lib/customerio";
import { links } from "@/lib/links";
import { getSession } from "@/lib/session";
import { site } from "@/lib/site";

const FEATURES = [
  {
    title: "Sign-in with Auth.js",
    body: "GitHub sign-in when you add an OAuth app. Until then, a demo sign-in lets you try everything with no setup.",
  },
  {
    title: "Customer.io on the server only",
    body: "Keys stay on the server. Every call has a timeout and returns a typed result, so a Customer.io problem never breaks sign-up.",
  },
  {
    title: "Works before email is ready",
    body: "A new Customer.io workspace cannot send email yet. Sign-up still works, and the dashboard lists what to finish.",
  },
  {
    title: "No database",
    body: "Sessions live in an encrypted cookie. Add a database when your app needs one.",
  },
];

export default async function Home() {
  const session = await getSession();
  const { demo } = authSetup();
  const config = getCustomerioConfig();
  const endpoints = signupEndpoints(config.region);

  return (
    <>
      <SiteHeader>
        {session ? (
          <ButtonLink href="/dashboard" variant="secondary">
            Dashboard
          </ButtonLink>
        ) : (
          <ButtonLink href="/sign-in" variant="secondary">
            Sign in
          </ButtonLink>
        )}
      </SiteHeader>

      <main id="main" className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <section className="grid items-center gap-x-16 gap-y-12 pt-10 pb-20 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24 lg:pb-28">
          <div>
            <h1 className="font-display-wide text-display font-semibold">
              Every signup lands in Customer.io.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-8 text-muted">
              A Next.js starter with sign-in, a dashboard, and Customer.io set up on the server.
              When someone signs up, they are added as a person, a{" "}
              <code className="font-mono text-[0.95em] text-ink">{SIGNED_UP_EVENT}</code> event is
              recorded, and a welcome email goes out.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              {session ? (
                <ButtonLink href="/dashboard">Open your dashboard</ButtonLink>
              ) : (
                <ButtonLink href="/sign-in">Create an account</ButtonLink>
              )}
              <ButtonLink href={site.repoUrl} variant="secondary">
                Get the code
              </ButtonLink>
            </div>
            {demo && !session ? (
              <p className="mt-4 text-sm text-faint">Demo sign-in is on. No password needed.</p>
            ) : null}
          </div>

          <SignupTrace
            title="What happens on signup"
            aside={config.region === "eu" ? "EU region" : "US region"}
            steps={[
              {
                title: "Add the person",
                ...endpoints.identify,
                payload: "id, email, name, created_at",
                state: "planned",
              },
              {
                title: "Record the event",
                ...endpoints.event,
                payload: `name: "${SIGNED_UP_EVENT}"`,
                state: "planned",
              },
              {
                title: "Send the welcome email",
                ...endpoints.email,
                payload: "to, identifiers, subject, body",
                state: "planned",
              },
            ]}
            footer={
              <>
                All three run on the server, inside the Auth.js sign-in event. See{" "}
                <code className="font-mono text-[0.8125rem] text-ink">lib/customerio</code>.
              </>
            }
          />
        </section>

        <section
          aria-labelledby="inside"
          className="grid gap-x-16 gap-y-8 border-t border-line py-16 lg:grid-cols-[1fr_2fr]"
        >
          <h2 id="inside" className="font-display-wide text-title font-semibold">
            What you get
          </h2>
          <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <dt className="font-medium">{feature.title}</dt>
                <dd className="mt-2 leading-7 text-muted">{feature.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 text-sm text-muted sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-8">
          <p>MIT License. Made by Customer.io.</p>
          <nav aria-label="Footer" className="-mx-2 flex flex-wrap">
            <a
              className="inline-flex min-h-11 items-center rounded-md px-2 hover:text-ink"
              href={links.docs}
            >
              Customer.io docs
            </a>
            <a
              className="inline-flex min-h-11 items-center rounded-md px-2 hover:text-ink"
              href={site.repoUrl}
            >
              Source on GitHub
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
