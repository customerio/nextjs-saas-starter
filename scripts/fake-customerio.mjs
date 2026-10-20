/**
 * A fake Customer.io for local testing. Load it before Next.js starts:
 *
 *   FAKE_CIO_DIR=/tmp/fake-cio NODE_OPTIONS="--import ./scripts/fake-customerio.mjs" pnpm dev
 *
 * Every server-side `fetch` to a *.customer.io host is answered here and
 * never leaves your machine. Each call is appended to $FAKE_CIO_DIR/calls.jsonl.
 *
 * Write one word to $FAKE_CIO_DIR/mode to choose how email sends answer:
 *   ok                  every send works (the default)
 *   owner_unconfirmed   403 "Account owner's email address is not confirmed..."
 *   not_approved        403 "Account is not yet approved for sending..."
 *   no_domain           400 "No "from" address was provided and ..."
 *   do_not_send         403 "Workspace is set to "Do Not Send"..." (trial ended,
 *                       account suspended, or "Never send messages")
 *
 * The mode is read on every call, so you can flip it while the app runs.
 * Track API calls (identify, events) always succeed.
 */
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dir = process.env.FAKE_CIO_DIR ?? path.resolve(".fake-customerio");
mkdirSync(dir, { recursive: true });

const ANSWERS = {
  owner_unconfirmed: [
    403,
    "Account owner's email address is not confirmed. Please confirm your email address to send messages.",
  ],
  not_approved: [
    403,
    "Account is not yet approved for sending.  Verify your account (https://customer.io/docs/account-verification) to send messages.",
  ],
  do_not_send: [403, 'Workspace is set to "Do Not Send" in account workspace settings.'],
  no_domain: [
    400,
    'No "from" address was provided and this workspace has no verified sending domain to use as a default. Verify a sending domain (https://customer.io/docs/authentication) or include a "from" address from a verified domain.',
  ],
};

function mode() {
  try {
    return readFileSync(path.join(dir, "mode"), "utf8").trim() || "ok";
  } catch {
    return "ok";
  }
}

const realFetch = globalThis.fetch;
let deliveries = 0;

globalThis.fetch = async function fakeCustomerioFetch(input, init) {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (!url.hostname.endsWith("customer.io")) return realFetch(input, init);

  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  const body = typeof init?.body === "string" ? init.body : null;
  const isSend = url.pathname.endsWith("/send/email");
  const current = isSend ? mode() : "ok";
  const answer = ANSWERS[current];

  appendFileSync(
    path.join(dir, "calls.jsonl"),
    JSON.stringify({ at: new Date().toISOString(), method, url: url.href, mode: current, body }) +
      "\n",
  );

  if (answer) {
    const [status, error] = answer;
    return new Response(JSON.stringify({ meta: { error } }), {
      status,
      headers: { "content-type": "application/json" },
    });
  }
  const json = isSend
    ? { delivery_id: `fake-delivery-${++deliveries}`, queued_at: Date.now() }
    : {};
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

console.log(
  `[fake-customerio] answering *.customer.io locally. Log: ${path.join(dir, "calls.jsonl")}`,
);
