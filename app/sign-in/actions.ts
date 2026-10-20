"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { hasDatabase } from "@/lib/db";
import { isDemo } from "@/lib/demo";

export interface LinkFormState {
  error: string | null;
  email: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The "Email me a sign-in link" form. Auth.js does the rest (see auth.ts). */
export async function requestLink(
  _previous: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  const email = String(formData.get("email") ?? "").trim();

  // Honeypot: people never see this field, simple bots fill it in. Pretend it
  // worked so the bot learns nothing, and send nothing.
  if (String(formData.get("website") ?? "") !== "") redirect("/check-email");

  if (isDemo()) return { error: "This demo doesn’t send sign-in emails.", email };
  if (!EMAIL.test(email) || email.length > 254) {
    return { error: "Enter your full email address, like ada@example.com.", email };
  }
  if (!hasDatabase()) {
    return {
      error:
        "This site has no database yet, so it can’t sign anyone in. Add Neon to the Vercel project (see the README).",
      email,
    };
  }

  let next: URL;
  try {
    // `redirect: false` hands back the URL Auth.js wants to go to, so we can
    // go straight to our own page instead of bouncing through /api/auth.
    const url = await signIn("email", { email, redirectTo: "/dashboard", redirect: false });
    next = new URL(String(url), "http://localhost");
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    console.error("[auth] sign-in link request failed:", error);
    return { error: "We couldn’t start sign-in. Try again in a minute.", email };
  }

  // The rate limit (auth.ts) answers with /sign-in?error=rate_limited.
  if (next.pathname === "/sign-in") {
    return { error: RATE_LIMITED, email };
  }
  redirect("/check-email");
}

const RATE_LIMITED =
  "You asked for a few links in a row. Wait 15 minutes, or use the newest link in your inbox.";
