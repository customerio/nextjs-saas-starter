import "server-only";

import { after } from "next/server";

import { createAppClient, createTrackClient } from "@/lib/customerio/clients";
import { getCustomerioConfig } from "@/lib/customerio/config";
import { getDb } from "@/lib/db";
import { dbAppStore } from "@/lib/db/app-store";
import { site, siteUrl } from "@/lib/site";

import type { FlowDeps } from "./deps";

/** `storage` replaces the database in demo mode (lib/demo-server.ts). */
export function defaultDeps(storage?: Pick<FlowDeps, "db" | "store">): FlowDeps {
  const config = getCustomerioConfig();
  const db = storage?.db ?? getDb();
  return {
    db,
    store: storage?.store ?? dbAppStore(db),
    config,
    track: createTrackClient(config),
    app: createAppClient(config),
    now: () => new Date(),
    appName: site.name,
    siteUrl: siteUrl(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    isDev: process.env.NODE_ENV === "development",
    defer: (task) =>
      after(() =>
        task().catch((error: unknown) =>
          console.error("[customerio] background step failed:", error),
        ),
      ),
    log: console,
  };
}
