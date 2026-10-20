import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { APIClient, CustomerIORequestError, RegionUS, SendEmailRequest } from "customerio-node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { classifyError, isEmailSetupFailure, isTemporaryFailure } from "./errors";

/** Builds the error the SDK throws for a `{ meta: { error } }` response. */
function apiError(status: number, message: string) {
  const json = { meta: { error: message } };
  return new CustomerIORequestError(
    json,
    status,
    { statusCode: status, headers: {}, ok: false },
    JSON.stringify(json),
  );
}

describe("classifyError: a new workspace that cannot send yet", () => {
  it.each([
    [
      403,
      "Account owner's email address is not confirmed. Please confirm your email address to send messages.",
      "owner_email_unconfirmed",
    ],
    [
      403,
      "Account is not yet approved for sending.  Verify your account (https://customer.io/docs/account-verification) to send messages.",
      "account_not_approved",
    ],
    [
      400,
      'No "from" address was provided and this workspace has no verified sending domain to use as a default. Verify a sending domain (https://customer.io/docs/authentication) or include a "from" address from a verified domain.',
      "no_from_address",
    ],
    [
      400,
      '"from" address domain example.com has not been verified. Verify your domain (https://customer.io/docs/authentication) to use this "from" address.',
      "from_domain_unverified",
    ],
    [403, 'Workspace is set to "Do Not Send" in account workspace settings.', "delivery_disabled"],
  ])("HTTP %i %j is %s", (status, message, kind) => {
    const failure = classifyError(apiError(status, message));
    expect(failure).toEqual({ kind, status, message: message.replace(/\s+/g, " ") });
    expect(isEmailSetupFailure(failure)).toBe(true);
    expect(isTemporaryFailure(failure)).toBe(false);
  });
});

describe("classifyError: everything else", () => {
  it.each([
    [401, "Unauthorized request", "unauthorized"],
    [403, "Forbidden", "unauthorized"],
    [404, "transactional message not found", "message_not_found"],
    [422, "to is required", "invalid_request"],
    [429, "Too many requests", "rate_limited"],
    [503, "Service unavailable", "server_error"],
  ])("HTTP %i is %s", (status, message, kind) => {
    const failure = classifyError(apiError(status, message));
    expect(failure.kind).toBe(kind);
    expect(isEmailSetupFailure(failure)).toBe(false);
  });

  it("reads the raw body when the response is not the usual JSON", () => {
    const error = new CustomerIORequestError(
      null,
      502,
      { statusCode: 502, headers: {}, ok: false },
      "Bad gateway",
    );
    expect(classifyError(error)).toEqual({
      kind: "server_error",
      status: 502,
      message: "Bad gateway",
    });
  });

  it("recognizes timeouts", () => {
    const failure = classifyError(new DOMException("The operation timed out.", "TimeoutError"));
    expect(failure.kind).toBe("timeout");
    expect(isTemporaryFailure(failure)).toBe(true);
  });

  it("recognizes network errors", () => {
    expect(classifyError(new TypeError("fetch failed")).kind).toBe("network");
  });

  it("never throws on odd values", () => {
    expect(classifyError("boom")).toEqual({ kind: "unknown", status: null, message: "boom" });
    expect(classifyError(undefined).kind).toBe("unknown");
  });

  it("shortens very long messages", () => {
    const failure = classifyError(apiError(400, "x".repeat(1000)));
    expect(failure.message.length).toBeLessThanOrEqual(280);
  });
});

describe("classifyError with the real SDK", () => {
  // A local server that answers like Customer.io does for an unapproved
  // account. Nothing leaves this machine.
  let server: Server;
  let url: string;

  beforeAll(async () => {
    server = createServer((_request, response) => {
      response.writeHead(403, { "content-type": "application/json" });
      response.end(JSON.stringify({ meta: { error: "Account is not yet approved for sending." } }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("classifies the error sendEmail throws", async () => {
    const client = new APIClient("fake-key", { region: RegionUS, url, retry: { maxRetries: 0 } });
    const request = new SendEmailRequest({
      to: "ada@example.com",
      identifiers: { id: "1" },
      from: "hello@example.com",
      subject: "Hi",
      body: "Hi",
    });
    const error = await client.sendEmail(request).catch((caught: unknown) => caught);
    expect(classifyError(error)).toMatchObject({ kind: "account_not_approved", status: 403 });
  });
});
