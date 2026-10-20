import { describe, expect, it } from "vitest";

import { browserSdkState, cdnUrlFor } from "./browser";
import { readCustomerioConfig } from "./config";

describe("browser SDK config", () => {
  it("uses the EU CDN for EU workspaces and the US CDN otherwise", () => {
    expect(cdnUrlFor("eu")).toBe("https://cdp-eu.customer.io");
    expect(cdnUrlFor("us")).toBe("https://cdp.customer.io");
  });

  it("turns on with a write key and passes only public values", () => {
    const state = browserSdkState(
      readCustomerioConfig({
        CUSTOMERIO_CDP_WRITE_KEY: "write-key",
        CUSTOMERIO_SITE_ID: "site",
        CUSTOMERIO_TRACK_API_KEY: "track-secret",
        CUSTOMERIO_APP_API_KEY: "app-secret",
        CUSTOMERIO_REGION: "eu",
      }),
    );
    expect(state).toEqual({
      enabled: true,
      config: { writeKey: "write-key", siteId: "site", cdnURL: "https://cdp-eu.customer.io" },
    });
    expect(JSON.stringify(state)).not.toMatch(/secret/);
  });

  it("explains why it is off, in both regions", () => {
    expect(browserSdkState(readCustomerioConfig({ CUSTOMERIO_REGION: "eu" }))).toEqual({
      enabled: false,
      reason: "no_write_key",
    });
    expect(browserSdkState(readCustomerioConfig({}))).toEqual({
      enabled: false,
      reason: "no_write_key",
    });
  });

  it("stays off when the region is invalid", () => {
    const state = browserSdkState(
      readCustomerioConfig({ CUSTOMERIO_CDP_WRITE_KEY: "write-key", CUSTOMERIO_REGION: "asia" }),
    );
    expect(state.enabled).toBe(false);
  });
});
