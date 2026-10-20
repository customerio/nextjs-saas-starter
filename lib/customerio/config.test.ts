import { describe, expect, it } from "vitest";

import { describeEnv, readCustomerioConfig } from "./config";

const FULL = {
  CUSTOMERIO_SITE_ID: "site",
  CUSTOMERIO_TRACK_API_KEY: "track-key",
  CUSTOMERIO_APP_API_KEY: "app-key",
  CUSTOMERIO_WORKSPACE_ID: "123",
  CUSTOMERIO_REGION: "eu",
};

describe("readCustomerioConfig", () => {
  it("runs with no variables at all", () => {
    const config = readCustomerioConfig({});
    expect(config).toMatchObject({
      region: "us",
      regionSource: "default",
      track: null,
      appApiKey: null,
      workspaceId: null,
      problems: [],
    });
  });

  it("reads every variable the integration writes", () => {
    const config = readCustomerioConfig(FULL);
    expect(config.track).toEqual({ siteId: "site", apiKey: "track-key" });
    expect(config.appApiKey).toBe("app-key");
    expect(config.workspaceId).toBe("123");
    expect(config.region).toBe("eu");
    expect(config.regionSource).toBe("env");
  });

  it("needs both the site ID and the Track API key", () => {
    expect(readCustomerioConfig({ CUSTOMERIO_SITE_ID: "site" }).track).toBeNull();
    expect(readCustomerioConfig({ CUSTOMERIO_TRACK_API_KEY: "key" }).track).toBeNull();
  });

  it("treats blank values as missing", () => {
    const config = readCustomerioConfig({ CUSTOMERIO_SITE_ID: "  ", CUSTOMERIO_APP_API_KEY: "" });
    expect(config.track).toBeNull();
    expect(config.appApiKey).toBeNull();
  });

  it.each([
    ["us", "us"],
    ["eu", "eu"],
    [" EU ", "eu"],
    ["US", "us"],
  ])("reads region %j as %s", (raw, region) => {
    expect(readCustomerioConfig({ CUSTOMERIO_REGION: raw }).region).toBe(region);
  });

  it("sends nothing when the region is not us or eu", () => {
    const config = readCustomerioConfig({ ...FULL, CUSTOMERIO_REGION: "asia" });
    expect(config.track).toBeNull();
    expect(config.appApiKey).toBeNull();
    expect(config.problems).toEqual([
      { variable: "CUSTOMERIO_REGION", message: expect.stringContaining("asia") },
    ]);
  });

  it.each(["hello@example.com", "Example <hello@example.com>"])("accepts from %j", (from) => {
    expect(readCustomerioConfig({ CUSTOMERIO_FROM_EMAIL: from }).fromEmail).toBe(from);
  });

  it("rejects a from value that is not an email", () => {
    const config = readCustomerioConfig({ CUSTOMERIO_FROM_EMAIL: "hello" });
    expect(config.fromEmail).toBeNull();
    expect(config.problems[0]?.variable).toBe("CUSTOMERIO_FROM_EMAIL");
  });
});

describe("new optional variables", () => {
  it("reads the browser key and site ID, and drops them for an invalid region", () => {
    const env = { CUSTOMERIO_CDP_WRITE_KEY: "wk", CUSTOMERIO_SITE_ID: "site" };
    expect(readCustomerioConfig(env)).toMatchObject({ cdpWriteKey: "wk", siteId: "site" });
    expect(readCustomerioConfig({ ...env, CUSTOMERIO_REGION: "mars" })).toMatchObject({
      cdpWriteKey: null,
      siteId: null,
    });
  });

  it("lowercases OWNER_EMAIL and rejects a value that is not an address", () => {
    expect(readCustomerioConfig({ OWNER_EMAIL: " Owner@Acme.TEST " }).ownerEmail).toBe(
      "owner@acme.test",
    );
    const config = readCustomerioConfig({ OWNER_EMAIL: "Owner <owner@acme.test>" });
    expect(config.ownerEmail).toBeNull();
    expect(config.problems[0]?.variable).toBe("OWNER_EMAIL");
  });

  it("reads the two message IDs", () => {
    expect(
      readCustomerioConfig({
        CUSTOMERIO_MAGIC_LINK_MESSAGE_ID: "3",
        CUSTOMERIO_WELCOME_MESSAGE_ID: "4",
      }),
    ).toMatchObject({ magicLinkMessageId: "3", welcomeMessageId: "4" });
  });
});

describe("describeEnv", () => {
  it("lists every variable with who writes it", () => {
    const rows = describeEnv({});
    expect(rows.map((row) => row.info.setBy)).toContain("neon");
    expect(rows.find((row) => row.info.name === "AUTH_SECRET")?.info.setBy).toBe("you");
  });

  it("reports which variables are set, never their values", () => {
    const rows = describeEnv({ CUSTOMERIO_TRACK_API_KEY: "secret-value" });
    const track = rows.find((row) => row.info.name === "CUSTOMERIO_TRACK_API_KEY");
    expect(track?.isSet).toBe(true);
    expect(rows.find((row) => row.info.name === "CUSTOMERIO_SITE_ID")?.isSet).toBe(false);
    expect(JSON.stringify(rows)).not.toContain("secret-value");
  });
});
