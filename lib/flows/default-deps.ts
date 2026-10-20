import "server-only";

import { after } from "next/server";

import { createAppClient, createTrackClient } from "@/lib/customerio/clients";
import { getCustomerioConfig } from "@/lib/customerio/config";
import { getDb } from "@/lib/db";
import { site, siteUrl } from "@/lib/site";

import type { FlowDeps } from "./deps";

export function defaultDeps(): FlowDeps {
  const config = getCustomerioConfig();
  return {
    db: getDb(),
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
