"use server";

import { redirect } from "next/navigation";

import { isDemo } from "@/lib/demo";
import { startDemo } from "@/lib/demo-server";

/** "Try the demo": signs the visitor in to the demo and opens the dashboard. */
export async function startDemoAction(): Promise<void> {
  if (!isDemo()) redirect("/sign-in");
  await startDemo();
  redirect("/dashboard");
}
