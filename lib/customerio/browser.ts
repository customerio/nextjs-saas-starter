import type { CustomerioConfig, CustomerioRegion } from "./config";

/**
 * What the browser SDK needs, built on the server and passed to the client as
 * props. Only public values go in here: the CDP write key is meant to be
 * public (it can only send data in), and the site ID is what in-app messages
 * use. API keys never leave the server.
 */
export interface BrowserSdkConfig {
  writeKey: string;
  siteId: string | null;
  cdnURL: string;
}

export type BrowserSdkState =
  | { enabled: true; config: BrowserSdkConfig }
  | {
      enabled: false;
      /** No write key: the integration did not add one yet, or local dev. */
      reason: "no_write_key";
    };

/** Settings and data go to the CDN host of the workspace's region. */
export function cdnUrlFor(region: CustomerioRegion): string {
  return region === "eu" ? "https://cdp-eu.customer.io" : "https://cdp.customer.io";
}

export function browserSdkState(config: CustomerioConfig): BrowserSdkState {
  if (!config.cdpWriteKey) {
    return { enabled: false, reason: "no_write_key" };
  }
  return {
    enabled: true,
    config: {
      writeKey: config.cdpWriteKey,
      siteId: config.siteId,
      cdnURL: cdnUrlFor(config.region),
    },
  };
}
