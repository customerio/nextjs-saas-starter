import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import type { EmailConfig } from "next-auth/providers/email";
import { cookies, headers } from "next/headers";

import { getDb } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { defaultDeps } from "@/lib/flows/default-deps";
import { handleLinkRequest } from "@/lib/flows/link-request";
import { writeLinkRequestCookie } from "@/lib/flows/link-request-cookie";
import { checkLinkRequest, clientIp } from "@/lib/flows/rate-limit";
import { handleSignIn } from "@/lib/flows/signup";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

/** Sign-in links work for this long, and only once. */
export const LINK_MAX_AGE_SECONDS = 15 * 60;

/**
 * Email sign-in, sent through Customer.io instead of SMTP. Auth.js makes the
 * token and the link, stores a hash of the token, and calls
 * `sendVerificationRequest`; we send the email and record what happened.
 */
const customerioEmail: EmailConfig = {
  id: "email",
  type: "email",
  name: "Email",
  maxAge: LINK_MAX_AGE_SECONDS,
  async sendVerificationRequest({ identifier, url, expires }) {
    const outcome = await handleLinkRequest(defaultDeps(), { email: identifier, url, expires });
    // Tells the "check your email" page what happened. It never holds the
    // link, except on a Preview deployment while email cannot send yet.
    await writeLinkRequestCookie(await cookies(), {
      email: identifier,
      delivery: outcome.delivery,
      revealedUrl: outcome.revealedUrl,
    });
  },
};

/** Your secret, from AUTH_SECRET. Local dev gets a fixed one so `pnpm dev` just works. */
const devSecret =
  process.env.NODE_ENV === "development" && !process.env.AUTH_SECRET
    ? { secret: "dev-only-secret-do-not-use-in-production-0000000000" }
    : {};

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  ...devSecret,
  // The adapter is built per request so a missing DATABASE_URL shows up as a
  // clear error on the pages that need it, not as a crash at import time.
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [customerioEmail],
  // Database sessions: the cookie holds a random ID and the session lives in
  // Postgres. It is the adapter's default, there is no JWT to configure, and
  // signing out really ends the session on the server.
  session: { strategy: "database" },
  pages: { signIn: "/sign-in", verifyRequest: "/check-email", error: "/sign-in" },
  callbacks: {
    /**
     * Runs before a link is made. We use it for the rate limit, so it holds
     * for the form and for anyone posting to /api/auth directly.
     */
    async signIn({ user, email }) {
      if (!email?.verificationRequest || !user.email) return true;
      const decision = await checkLinkRequest(
        getDb(),
        { email: user.email, ip: clientIp(await headers()) },
        new Date(),
      );
      return decision.allowed ? true : "/sign-in?error=rate_limited";
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    /**
     * Runs after every successful sign-in. The first one with a verified email
     * is the signup: identify, `signed_up`, welcome email, owner note. Nothing
     * in here throws or waits on Customer.io.
     */
    async signIn({ user, account }) {
      if (account?.type !== "email" || !user.id || !user.email) return;
      try {
        await handleSignIn(defaultDeps(), { id: user.id, email: user.email });
      } catch (error) {
        console.error("[signup] could not record the signup:", error);
      }
    },
  },
}));
