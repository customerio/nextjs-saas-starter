"use server";

import { revalidatePath } from "next/cache";

import { auth, signOut } from "@/auth";
import { defaultDeps, sendWelcomeEmail } from "@/lib/customerio";
import { readSignupRecord, saveSignupRecord } from "@/lib/signup-record";
import { site, siteUrl } from "@/lib/site";

/** Try the welcome email again, for example after you verify a sending domain. */
export async function retryWelcomeEmail() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) return;

  const record = await readSignupRecord(user.id);
  if (!record || record.report.email.status === "done") return;

  const deps = defaultDeps({ appName: site.name, dashboardUrl: `${siteUrl()}/dashboard` });
  const email = await sendWelcomeEmail(
    { id: user.id, email: user.email, name: user.name ?? null, method: user.method },
    deps,
  );
  await saveSignupRecord({ ...record, report: { ...record.report, email } });
  revalidatePath("/dashboard");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
