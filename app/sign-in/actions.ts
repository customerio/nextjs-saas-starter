"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";

export interface DemoSignInState {
  error: string | null;
  name: string;
  email: string;
}

export async function signInWithDemo(
  _previous: DemoSignInState,
  formData: FormData,
): Promise<DemoSignInState> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  try {
    await signIn("demo", { name, email, redirectTo: "/dashboard" });
    return { error: null, name, email };
  } catch (error) {
    // A successful sign-in throws a redirect. Let it through.
    if (!(error instanceof AuthError)) throw error;
    const message =
      error.type === "CredentialsSignin"
        ? "Enter a full email address, like ada@example.com."
        : "Sign-in failed. Check the server logs for details.";
    return { error: message, name, email };
  }
}

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/dashboard" });
}
