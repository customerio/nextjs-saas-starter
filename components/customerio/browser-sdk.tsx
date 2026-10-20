"use client";

import type { AnalyticsBrowser } from "@customerio/cdp-analytics-browser";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import type { BrowserSdkConfig } from "@/lib/customerio/browser";

/**
 * Loads the Customer.io browser SDK once, when the server passed a config
 * (that is, when CUSTOMERIO_CDP_WRITE_KEY is set). It then:
 *
 * - sends a page view on every route change,
 * - identifies the signed-in person with the same ID the server uses,
 * - resets on sign-out, so the next person on this browser starts clean,
 * - turns on in-app messages and the inbox with the site ID.
 *
 * The SDK is loaded with a dynamic import, so it is not in the first bundle
 * and pages render the same without it.
 */

type Analytics = Awaited<AnalyticsBrowser>[0];

export type SdkStatus = "off" | "loading" | "ready" | "failed";

interface SdkContext {
  status: SdkStatus;
  analytics: Analytics | null;
  /** True when the in-app plugin is on (a site ID was set). */
  inApp: boolean;
}

const Context = createContext<SdkContext>({ status: "off", analytics: null, inApp: false });

export const useCustomerio = () => useContext(Context);

const IN_APP_PLUGIN = "Customer.io In-App Plugin";

// One instance per page load, shared across every render and route.
let loading: Promise<Analytics> | null = null;

function load(config: BrowserSdkConfig): Promise<Analytics> {
  loading ??= import("@customerio/cdp-analytics-browser").then(async ({ AnalyticsBrowser }) => {
    const [analytics] = await AnalyticsBrowser.load(
      { writeKey: config.writeKey, cdnURL: config.cdnURL },
      config.siteId
        ? {
            integrations: {
              [IN_APP_PLUGIN]: { siteId: config.siteId, colorScheme: "system" },
            },
          }
        : {},
    );
    return analytics;
  });
  return loading;
}

export function CustomerioBrowser({
  config,
  userId,
  children,
}: {
  config: BrowserSdkConfig | null;
  /** The signed-in person's ID (the same one the server identifies), or null. */
  userId: string | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<SdkContext>({
    status: config ? "loading" : "off",
    analytics: null,
    inApp: Boolean(config?.siteId),
  });
  const pathname = usePathname();
  const lastPage = useRef<string | null>(null);

  useEffect(() => {
    if (!config) return;
    let active = true;
    load(config).then(
      (analytics) => active && setState((current) => ({ ...current, status: "ready", analytics })),
      (error: unknown) => {
        // Usually an ad blocker. The app works the same without the SDK.
        console.warn("[customerio] browser SDK did not load:", error);
        if (active) setState((current) => ({ ...current, status: "failed" }));
      },
    );
    return () => {
      active = false;
    };
  }, [config]);

  const { analytics } = state;

  // Identify on sign-in, reset on sign-out. The SDK keeps the ID in local
  // storage, so we compare with it instead of with the last render.
  useEffect(() => {
    if (!analytics) return;
    const known = analytics.user().id();
    if (userId && known !== userId) void analytics.identify(userId);
    if (!userId && known) void analytics.reset();
  }, [analytics, userId]);

  // A page view per route. Runs after identify, so it lands on the right person.
  useEffect(() => {
    if (!analytics || lastPage.current === pathname) return;
    lastPage.current = pathname;
    void analytics.page();
  }, [analytics, pathname]);

  return <Context value={state}>{children}</Context>;
}
