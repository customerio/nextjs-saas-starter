import { createHash } from "node:crypto";

import NextAuth, { CredentialsSignin, type DefaultSession, type User } from "next-auth";
import type { Account } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

import { defaultDeps, identifyPerson, recordSignup, type Person } from "@/lib/customerio";
import { readSignupRecord, saveSignupRecord } from "@/lib/signup-record";
import { site, siteUrl } from "@/lib/site";

declare module "next-auth" {
  interface Session {
    user: { id: string; method: string } & DefaultSession["user"];
  }
}

/**
 * Which ways to sign in are turned on. Read from env so a deploy works with no
 * extra setup, and GitHub turns on when you add its two variables.
 */
export function authSetup() {
  const env = process.env;
  const github = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);
  // Demo sign-in is on until you add GitHub, unless you say otherwise.
  const demo = env.AUTH_DEMO_SIGN_IN ? env.AUTH_DEMO_SIGN_IN === "true" : !github;
  return { github, demo, hasSecret: Boolean(env.AUTH_SECRET) };
}

const setup = authSetup();

class InvalidDemoDetails extends CredentialsSignin {
  code = "invalid_details";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Demo sign-in: a name and an email, no password, no database.
 * Anyone can sign in as any email, so turn it off before real users arrive
 * (AUTH_DEMO_SIGN_IN=false). It exists so a fresh deploy works in one click.
 */
const demoProvider = Credentials({
  id: "demo",
  name: "Demo account",
  credentials: { name: { label: "Name" }, email: { label: "Email", type: "email" } },
  authorize(credentials): User {
    const email = String(credentials.email ?? "")
      .trim()
      .toLowerCase();
    const name = String(credentials.name ?? "")
      .trim()
      .slice(0, 80);
    if (!EMAIL.test(email) || email.length > 254) throw new InvalidDemoDetails();
    const hash = createHash("sha256").update(email).digest("hex").slice(0, 20);
    return { id: `demo-${hash}`, email, name: name || null };
  },
});

/** A stable Customer.io ID per person. Never use the email as the ID. */
function personIdFor(user: User, account: Account): string {
  if (account.provider === "github") return `github-${account.providerAccountId}`;
  return user.id ?? account.providerAccountId;
}

/** Your secret, from AUTH_SECRET. Local dev gets a fixed one so `pnpm dev` just works. */
const devSecret =
  process.env.NODE_ENV === "development" && !process.env.AUTH_SECRET
    ? { secret: "dev-only-secret-do-not-use-in-production-0000000000" }
    : {};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...devSecret,
  providers: [...(setup.github ? [GitHub] : []), ...(setup.demo ? [demoProvider] : [])],
  // No database: the session lives in an encrypted cookie.
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  callbacks: {
    jwt({ token, user, account }) {
      // `user` and `account` are only present on the sign-in request itself.
      if (user && account) {
        token.sub = personIdFor(user, account);
        token.method = account.provider;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.method = typeof token.method === "string" ? token.method : "unknown";
      return session;
    },
  },
  events: {
    /**
     * Runs on the server after every successful sign-in. Auth.js waits for it,
     * so the dashboard can show the result right away. Nothing in here throws:
     * Customer.io trouble never blocks sign-in.
     */
    async signIn({ user, account }) {
      if (!account || !user.email) return;
      const person: Person = {
        id: personIdFor(user, account),
        email: user.email,
        name: user.name ?? null,
        method: account.provider,
      };
      const deps = defaultDeps({ appName: site.name, dashboardUrl: `${siteUrl()}/dashboard` });

      if (await readSignupRecord(person.id)) {
        // Returning person: keep their name and email fresh in Customer.io.
        const result = await identifyPerson(person, deps, { isNew: false });
        if (result.status === "failed") {
          console.warn(
            "[customerio] identify failed:",
            result.failure.kind,
            result.failure.message,
          );
        }
        return;
      }

      const report = await recordSignup(person, deps);
      for (const [step, result] of Object.entries(report)) {
        if (result.status === "failed") {
          console.warn(`[customerio] ${step} failed:`, result.failure.kind, result.failure.message);
        }
      }
      await saveSignupRecord({
        v: 1,
        personId: person.id,
        region: deps.config.region,
        signedUpAt: deps.now().toISOString(),
        report,
      });
    },
  },
});
