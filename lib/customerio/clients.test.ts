import { RegionEU, RegionUS } from "customerio-node";
import { describe, expect, it } from "vitest";

import { createAppClient, createTrackClient, sdkRegion } from "./clients";
import { readCustomerioConfig } from "./config";

const KEYS = {
  CUSTOMERIO_SITE_ID: "site",
  CUSTOMERIO_TRACK_API_KEY: "track-key",
  CUSTOMERIO_APP_API_KEY: "app-key",
};

describe("region selection", () => {
  it("maps us and eu to the SDK regions", () => {
    expect(sdkRegion("us")).toBe(RegionUS);
    expect(sdkRegion("eu")).toBe(RegionEU);
  });

  it("points EU workspaces at the EU hosts", () => {
    const config = readCustomerioConfig({ ...KEYS, CUSTOMERIO_REGION: "eu" });
    expect(createTrackClient(config)?.trackRoot).toBe(RegionEU.trackUrl);
    expect(createAppClient(config)?.apiRoot).toBe(RegionEU.apiUrl);
    expect(RegionEU.trackUrl).toContain("track-eu.customer.io");
  });

  it("uses the US hosts by default", () => {
    const config = readCustomerioConfig(KEYS);
    expect(createTrackClient(config)?.trackRoot).toBe(RegionUS.trackUrl);
    expect(createAppClient(config)?.apiRoot).toBe(RegionUS.apiUrl);
  });
});

describe("missing keys", () => {
  it("returns no clients when keys are missing", () => {
    const config = readCustomerioConfig({});
    expect(createTrackClient(config)).toBeNull();
    expect(createAppClient(config)).toBeNull();
  });
});
