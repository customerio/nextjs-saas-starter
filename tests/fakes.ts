import { CustomerIORequestError, type SendEmailRequest } from "customerio-node";
import { vi } from "vitest";

import { readCustomerioConfig } from "@/lib/customerio/config";
import type { Db } from "@/lib/db/store";
import type { FlowDeps } from "@/lib/flows/deps";

export const FULL_ENV = {
  CUSTOMERIO_SITE_ID: "site",
  CUSTOMERIO_TRACK_API_KEY: "track-key",
  CUSTOMERIO_APP_API_KEY: "app-key",
  CUSTOMERIO_REGION: "us",
};

/** The error the SDK throws for a `{ meta: { error } }` response. */
export function edgeError(status: number, message: string) {
  const json = { meta: { error: message } };
  return new CustomerIORequestError(
    json,
    status,
    { statusCode: status, headers: {}, ok: false },
    "",
  );
}

export const NOT_APPROVED =
  "Account is not yet approved for sending.  Verify your account (https://customer.io/docs/account-verification) to send messages.";
export const NOT_CONFIRMED =
  "Account owner's email address is not confirmed. Please confirm your email address to send messages.";

/** Flow deps with fake Customer.io clients. Background work runs inline and is awaited by `flush()`. */
export function fakeDeps(
  db: Db,
  env: Record<string, string> = FULL_ENV,
  overrides: Partial<FlowDeps> = {},
) {
  const config = readCustomerioConfig(env);
  const track = {
    identify: vi.fn<(...args: unknown[]) => Promise<object>>(async () => ({})),
    track: vi.fn<(...args: unknown[]) => Promise<object>>(async () => ({})),
  };
  const app = {
    sendEmail: vi.fn<(request: SendEmailRequest) => Promise<Record<string, unknown>>>(async () => ({
      delivery_id: "delivery-1",
    })),
  };
  const tasks: Promise<void>[] = [];
  let clock = new Date("2026-10-19T12:00:00Z");
  const deps: FlowDeps = {
    db,
    config,
    track: config.track ? track : null,
    app: config.appApiKey ? app : null,
    now: () => clock,
    appName: "Acme",
    siteUrl: "https://acme.test",
    vercelEnv: "production",
    isDev: false,
    defer: (task) => {
      tasks.push(task());
    },
    log: { info: vi.fn(), warn: vi.fn() },
    ...overrides,
  };
  return {
    deps,
    track,
    app,
    flush: async () => {
      while (tasks.length) await tasks.shift();
    },
    tick: (ms: number) => {
      clock = new Date(clock.getTime() + ms);
    },
    sent: () => app.sendEmail.mock.calls.map(([request]) => request.message),
  };
}
