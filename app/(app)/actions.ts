"use server";

import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { isDemo } from "@/lib/demo";
import { endDemo } from "@/lib/demo-server";

export async function signOutAction() {
  if (isDemo()) {
    await endDemo();
    redirect("/");
  }
  await signOut({ redirectTo: "/" });
}
