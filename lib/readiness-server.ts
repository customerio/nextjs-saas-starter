import "server-only";

import { getCustomerioConfig } from "@/lib/customerio/config";
import type { Readiness } from "@/lib/customerio/readiness";
import { getDb, hasDatabase } from "@/lib/db";
import { demoReadiness, isDemo } from "@/lib/demo";
import { currentReadiness } from "@/lib/flows/email-status";

/** Email readiness for a page. Never throws: a database problem reads as "not checked yet". */
export async function loadReadiness(): Promise<Readiness> {
  if (isDemo()) return demoReadiness(new Date());
  const config = getCustomerioConfig();
  if (!hasDatabase()) return config.appApiKey ? { kind: "unknown" } : { kind: "no_app_key" };
  try {
    return await currentReadiness({ db: getDb(), config });
  } catch (error) {
    console.error("[email] could not read the email status:", error);
    return { kind: "unknown" };
  }
}
