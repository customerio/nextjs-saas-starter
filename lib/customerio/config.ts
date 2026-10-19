import "server-only";

/**
 * Customer.io settings, read from environment variables.
 *
 * The Customer.io Vercel integration writes the first five variables into your
 * project for you. The last two are optional and you add them yourself.
 *
 * Every value is optional in code on purpose. The app keeps running without
 * them (for example in local dev before `vercel env pull`), skips the calls it
 * cannot make, and the dashboard explains what is missing.
 */

export type CustomerioRegion = "us" | "eu";

export type EnvVarName =
  | "CUSTOMERIO_SITE_ID"
  | "CUSTOMERIO_TRACK_API_KEY"
  | "CUSTOMERIO_APP_API_KEY"
  | "CUSTOMERIO_WORKSPACE_ID"
  | "CUSTOMERIO_REGION"
  | "CUSTOMERIO_FROM_EMAIL"
  | "CUSTOMERIO_WELCOME_MESSAGE_ID";

export interface EnvVarInfo {
  name: EnvVarName;
  /** Who sets it: the Customer.io integration, or you. */
  setBy: "integration" | "you";
  /** Secrets are never shown in the UI, only whether they are set. */
  secret: boolean;
  /** What breaks without it, in plain words. */
  purpose: string;
}

export const ENV_VARS: readonly EnvVarInfo[] = [
  {
    name: "CUSTOMERIO_SITE_ID",
    setBy: "integration",
    secret: false,
    purpose: "Track API: names your workspace when you identify people and send events.",
  },
  {
    name: "CUSTOMERIO_TRACK_API_KEY",
    setBy: "integration",
    secret: true,
    purpose: "Track API: the key that goes with the site ID.",
  },
  {
    name: "CUSTOMERIO_APP_API_KEY",
    setBy: "integration",
    secret: true,
    purpose: "Transactional API: sends the welcome email. Production and Preview only.",
  },
  {
    name: "CUSTOMERIO_WORKSPACE_ID",
    setBy: "integration",
    secret: false,
    purpose: "Links the dashboard to your workspace in Customer.io.",
  },
  {
    name: "CUSTOMERIO_REGION",
    setBy: "integration",
    secret: false,
    purpose: "us or eu. Picks the API hosts that hold your data.",
  },
  {
    name: "CUSTOMERIO_FROM_EMAIL",
    setBy: "you",
    secret: false,
    purpose: "Sender for the welcome email. Must use a domain you verified in Customer.io.",
  },
  {
    name: "CUSTOMERIO_WELCOME_MESSAGE_ID",
    setBy: "you",
    secret: false,
    purpose: "Optional. Send a transactional message you designed in Customer.io instead.",
  },
];

export interface ConfigProblem {
  variable: EnvVarName;
  message: string;
}

export interface CustomerioConfig {
  region: CustomerioRegion;
  /** "default" means CUSTOMERIO_REGION was not set, so we fell back to US. */
  regionSource: "env" | "default";
  /** Track API credentials. `null` when either part is missing. */
  track: { siteId: string; apiKey: string } | null;
  /** App API key for transactional messages. `null` when missing. */
  appApiKey: string | null;
  workspaceId: string | null;
  fromEmail: string | null;
  welcomeMessageId: string | null;
  /** Values that are set but wrong. Missing values are not problems. */
  problems: ConfigProblem[];
}

type Env = Record<string, string | undefined>;

/** Trims a value and turns an empty string into `null`. */
function read(env: Env, name: EnvVarName): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

// Accepts "hello@example.com" and "Example <hello@example.com>".
const FROM_EMAIL = /^(?:[^<>]+<\s*)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+(?:\s*>)?$/;

/**
 * Reads and checks the Customer.io environment variables.
 *
 * Pass `env` in tests. In the app, call {@link getCustomerioConfig} instead.
 */
export function readCustomerioConfig(env: Env = process.env): CustomerioConfig {
  const problems: ConfigProblem[] = [];

  const rawRegion = read(env, "CUSTOMERIO_REGION")?.toLowerCase() ?? null;
  let region: CustomerioRegion = "us";
  let regionValid = true;
  if (rawRegion === "us" || rawRegion === "eu") {
    region = rawRegion;
  } else if (rawRegion !== null) {
    regionValid = false;
    problems.push({
      variable: "CUSTOMERIO_REGION",
      message: `"${rawRegion}" is not a region. Use "us" or "eu".`,
    });
  }

  const siteId = read(env, "CUSTOMERIO_SITE_ID");
  const trackApiKey = read(env, "CUSTOMERIO_TRACK_API_KEY");

  let fromEmail = read(env, "CUSTOMERIO_FROM_EMAIL");
  if (fromEmail && !FROM_EMAIL.test(fromEmail)) {
    problems.push({
      variable: "CUSTOMERIO_FROM_EMAIL",
      message: "This is not an email address. Use hello@example.com or Name <hello@example.com>.",
    });
    fromEmail = null;
  }

  // With a broken region we cannot know which hosts hold the data, so we send
  // nothing rather than guess.
  return {
    region,
    regionSource: rawRegion === null ? "default" : "env",
    track: regionValid && siteId && trackApiKey ? { siteId, apiKey: trackApiKey } : null,
    appApiKey: regionValid ? read(env, "CUSTOMERIO_APP_API_KEY") : null,
    workspaceId: read(env, "CUSTOMERIO_WORKSPACE_ID"),
    fromEmail,
    welcomeMessageId: read(env, "CUSTOMERIO_WELCOME_MESSAGE_ID"),
    problems,
  };
}

/** The config for this server process. Env vars do not change at runtime. */
let cached: CustomerioConfig | undefined;
export function getCustomerioConfig(): CustomerioConfig {
  cached ??= readCustomerioConfig();
  return cached;
}

/**
 * Which variables are set, for the dashboard. Returns names and booleans only,
 * never values, so it is safe to render.
 */
export function describeEnv(env: Env = process.env): { info: EnvVarInfo; isSet: boolean }[] {
  return ENV_VARS.map((info) => ({ info, isSet: read(env, info.name) !== null }));
}
