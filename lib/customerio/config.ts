import "server-only";

/**
 * App settings, read from environment variables.
 *
 * Three places write them:
 * - the Customer.io Vercel integration (the CUSTOMERIO_* keys and region),
 * - the Neon integration (the database URLs),
 * - you (AUTH_SECRET, and a few optional ones).
 *
 * Every Customer.io value is optional in code on purpose. The app keeps
 * running without them (for example in local dev before `vercel env pull`),
 * skips the calls it cannot make, and the status page explains what is
 * missing.
 */

export type CustomerioRegion = "us" | "eu";

export type EnvVarName =
  | "CUSTOMERIO_SITE_ID"
  | "CUSTOMERIO_TRACK_API_KEY"
  | "CUSTOMERIO_APP_API_KEY"
  | "CUSTOMERIO_WORKSPACE_ID"
  | "CUSTOMERIO_REGION"
  | "CUSTOMERIO_CDP_WRITE_KEY"
  | "DATABASE_URL"
  | "DATABASE_URL_UNPOOLED"
  | "AUTH_SECRET"
  | "CUSTOMERIO_FROM_EMAIL"
  | "OWNER_EMAIL"
  | "CUSTOMERIO_MAGIC_LINK_MESSAGE_ID"
  | "CUSTOMERIO_WELCOME_MESSAGE_ID";

export type EnvVarSource = "customerio" | "neon" | "you";

export interface EnvVarInfo {
  name: EnvVarName;
  setBy: EnvVarSource;
  /** Secrets are never shown in the UI, only whether they are set. */
  secret: boolean;
  /** Optional variables show "Optional" instead of "Not set". */
  optional: boolean;
  /** What it is for, in plain words. */
  purpose: string;
}

export const ENV_VARS: readonly EnvVarInfo[] = [
  {
    name: "CUSTOMERIO_SITE_ID",
    setBy: "customerio",
    secret: false,
    optional: false,
    purpose: "Track API and in-app messages: names your workspace.",
  },
  {
    name: "CUSTOMERIO_TRACK_API_KEY",
    setBy: "customerio",
    secret: true,
    optional: false,
    purpose: "Track API: the key that goes with the site ID. Server only.",
  },
  {
    name: "CUSTOMERIO_APP_API_KEY",
    setBy: "customerio",
    secret: true,
    optional: false,
    purpose: "Transactional API: sends sign-in links and emails. Production and Preview only.",
  },
  {
    name: "CUSTOMERIO_WORKSPACE_ID",
    setBy: "customerio",
    secret: false,
    optional: false,
    purpose: "Links this page to your workspace in Customer.io.",
  },
  {
    name: "CUSTOMERIO_REGION",
    setBy: "customerio",
    secret: false,
    optional: false,
    purpose: "us or eu. Picks the API hosts that hold your data.",
  },
  {
    name: "CUSTOMERIO_CDP_WRITE_KEY",
    setBy: "customerio",
    secret: false,
    optional: true,
    purpose:
      "Browser SDK: page views and in-app messages. Public by design. US workspaces only for now.",
  },
  {
    name: "DATABASE_URL",
    setBy: "neon",
    secret: true,
    optional: false,
    purpose: "Pooled Postgres connection the app uses.",
  },
  {
    name: "DATABASE_URL_UNPOOLED",
    setBy: "neon",
    secret: true,
    optional: false,
    purpose: "Direct Postgres connection for migrations at build time.",
  },
  {
    name: "AUTH_SECRET",
    setBy: "you",
    secret: true,
    optional: false,
    purpose: "Signs Auth.js cookies and hashes sign-in tokens.",
  },
  {
    name: "CUSTOMERIO_FROM_EMAIL",
    setBy: "you",
    secret: false,
    optional: true,
    purpose: "Sender address. Without it, Customer.io uses your verified domain's default.",
  },
  {
    name: "OWNER_EMAIL",
    setBy: "you",
    secret: false,
    optional: true,
    purpose: "Gets an email for each new signup, and the \u201cCheck again\u201d test email.",
  },
  {
    name: "CUSTOMERIO_MAGIC_LINK_MESSAGE_ID",
    setBy: "you",
    secret: false,
    optional: true,
    purpose: "Send a sign-in email you designed in Customer.io instead of the built-in one.",
  },
  {
    name: "CUSTOMERIO_WELCOME_MESSAGE_ID",
    setBy: "you",
    secret: false,
    optional: true,
    purpose: "Send a welcome email you designed in Customer.io instead of the built-in one.",
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
  /** Browser SDK write key. Public by design, so it may reach the browser. */
  cdpWriteKey: string | null;
  /** The site ID on its own. The browser needs it for in-app messages. */
  siteId: string | null;
  fromEmail: string | null;
  ownerEmail: string | null;
  magicLinkMessageId: string | null;
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
const PLAIN_EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

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

  let ownerEmail = read(env, "OWNER_EMAIL")?.toLowerCase() ?? null;
  if (ownerEmail && !PLAIN_EMAIL.test(ownerEmail)) {
    problems.push({
      variable: "OWNER_EMAIL",
      message: "This is not an email address. Use a plain address like you@example.com.",
    });
    ownerEmail = null;
  }

  // With a broken region we cannot know which hosts hold the data, so we send
  // nothing rather than guess.
  return {
    region,
    regionSource: rawRegion === null ? "default" : "env",
    track: regionValid && siteId && trackApiKey ? { siteId, apiKey: trackApiKey } : null,
    appApiKey: regionValid ? read(env, "CUSTOMERIO_APP_API_KEY") : null,
    workspaceId: read(env, "CUSTOMERIO_WORKSPACE_ID"),
    cdpWriteKey: regionValid ? read(env, "CUSTOMERIO_CDP_WRITE_KEY") : null,
    siteId: regionValid ? siteId : null,
    fromEmail,
    ownerEmail,
    magicLinkMessageId: read(env, "CUSTOMERIO_MAGIC_LINK_MESSAGE_ID"),
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
 * Which variables are set, for the status page. Returns names and booleans only,
 * never values, so it is safe to render.
 */
export function describeEnv(env: Env = process.env): { info: EnvVarInfo; isSet: boolean }[] {
  return ENV_VARS.map((info) => ({ info, isSet: read(env, info.name) !== null }));
}
