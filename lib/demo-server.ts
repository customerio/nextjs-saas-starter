import "server-only";

import { cookies, headers } from "next/headers";

import type { AppStore } from "@/lib/db/app-store";
import {
  DEMO_DATA_COOKIE,
  DEMO_SESSION_COOKIE,
  demoCookieOptions,
  demoStore,
  noDatabase,
  readDemoData,
  writeDemoData,
} from "@/lib/demo";
import { defaultDeps } from "@/lib/flows/default-deps";
import type { FlowDeps } from "@/lib/flows/deps";

/** Demo mode's cookies. See lib/demo.ts. */

async function cookieOptions() {
  // Like Auth.js: https unless the request says otherwise.
  const proto = (await headers()).get("x-forwarded-proto") ?? "https";
  return demoCookieOptions(proto.split(",")[0]?.trim() === "https");
}

/** This visitor's demo data. Changes are saved back to their cookie (in server actions). */
export async function demoAppStore(): Promise<AppStore> {
  const jar = await cookies();
  const options = await cookieOptions();
  return demoStore(readDemoData(jar.get(DEMO_DATA_COOKIE)?.value), (data) =>
    jar.set(DEMO_DATA_COOKIE, writeDemoData(data), options),
  );
}

/** Flow deps for demo mode: no database, and the Customer.io config is empty. */
export async function demoDeps(): Promise<FlowDeps> {
  return defaultDeps({ db: noDatabase, store: await demoAppStore() });
}

/** "Try the demo": a fresh demo, signed in. */
export async function startDemo(): Promise<void> {
  const jar = await cookies();
  jar.delete(DEMO_DATA_COOKIE);
  jar.set(DEMO_SESSION_COOKIE, "1", await cookieOptions());
}

/** Sign out of the demo. Its data goes too. */
export async function endDemo(): Promise<void> {
  const jar = await cookies();
  jar.delete(DEMO_SESSION_COOKIE);
  jar.delete(DEMO_DATA_COOKIE);
}
