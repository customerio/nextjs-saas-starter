/**
 * Takes screenshots of every page, light and dark, desktop and phone, by
 * walking the real flow. It never calls Customer.io:
 *
 * - the server must run with the fake (scripts/fake-customerio.mjs) loaded,
 * - every browser request to Customer.io or Gist is answered by a stub here.
 *
 * It WIPES the app tables in THROWAWAY_DATABASE_URL. Point it at a local
 * Docker database, never at Neon.
 *
 *   docker run -d --name acme-shots -e POSTGRES_PASSWORD=acme -p 55432:5432 postgres:17
 *   export DATABASE_URL=postgres://postgres:acme@localhost:55432/postgres
 *   export FAKE_CIO_DIR=/tmp/acme-fake-cio  CUSTOMERIO_SITE_ID=x  CUSTOMERIO_TRACK_API_KEY=x \
 *          CUSTOMERIO_APP_API_KEY=x  CUSTOMERIO_CDP_WRITE_KEY=x  CUSTOMERIO_WORKSPACE_ID=1 \
 *          OWNER_EMAIL=owner@acme.test  AUTH_SECRET=$(openssl rand -base64 33)  AUTH_TRUST_HOST=true
 *   pnpm build && NODE_OPTIONS="--import ./scripts/fake-customerio.mjs" pnpm start &
 *   THROWAWAY_DATABASE_URL=$DATABASE_URL OUT=./screenshots pnpm screenshots
 */
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";
import pg from "pg";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve(process.env.OUT ?? "screenshots");
const FAKE_DIR = process.env.FAKE_CIO_DIR;
const DB_URL = process.env.THROWAWAY_DATABASE_URL;
// Must match the server's OWNER_EMAIL: the status page is for the owner only.
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "owner@acme.test";
if (!FAKE_DIR || !DB_URL) {
  console.error(
    "Set FAKE_CIO_DIR and THROWAWAY_DATABASE_URL. See the comment at the top of this file.",
  );
  process.exit(1);
}

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 375, height: 812 },
};

const hoursAgo = (hours) => new Date(Date.now() - hours * 3_600_000).toISOString();
const INBOX = [
  {
    queueId: "q-1",
    deliveryId: "d-1",
    messageType: "inbox",
    type: "inbox",
    priority: 1,
    topics: [],
    userToken: "u",
    sentAt: hoursAgo(0.07),
    expiry: hoursAgo(-48),
    opened: false,
    properties: {
      title: "Your workspace is ready",
      body: "Invite a teammate so you can plan your first project together.",
    },
  },
  {
    queueId: "q-2",
    deliveryId: "d-2",
    messageType: "inbox",
    type: "inbox",
    priority: 1,
    topics: [],
    userToken: "u",
    sentAt: hoursAgo(26),
    expiry: hoursAgo(-48),
    opened: true,
    properties: {
      title: "Tip: search from anywhere",
      body: "Press / on any page to jump to a project, a person, or a setting.",
    },
  },
];

/** Answers the browser SDK's settings, event, and in-app requests locally. */
async function stubCustomerio(context) {
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "*",
  };
  await context.route(
    (url) => url.hostname.endsWith("customer.io") || url.hostname.endsWith("gist.build"),
    (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      let body = {};
      if (url.pathname.includes("/settings")) {
        body = {
          integrations: {
            "Customer.io Data Pipelines": {
              apiKey: "fake",
              apiHost: "cdp.customer.io/v1",
              protocol: "https",
            },
          },
        };
      } else if (url.pathname.startsWith("/api/v4/users")) {
        body = { inAppMessages: [], inboxMessages: INBOX };
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: cors,
        body: JSON.stringify(body),
      });
    },
  );
}

const setMode = (mode) => writeFileSync(path.join(FAKE_DIR, "mode"), mode);

/** The sign-in link from the last email the fake received. */
function lastLink() {
  const calls = readFileSync(path.join(FAKE_DIR, "calls.jsonl"), "utf8").trim().split("\n");
  for (const line of calls.reverse()) {
    const call = JSON.parse(line);
    if (!call.url.endsWith("/send/email") || !call.body) continue;
    const body = JSON.parse(call.body);
    const href =
      body.message_data?.url ?? body.body?.match(/href="([^"]*\/callback\/email[^"]*)"/)?.[1];
    if (href) return href.replaceAll("&amp;", "&");
  }
  throw new Error("No sign-in link found in the fake's log.");
}

async function shoot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (overflow > 0) throw new Error(`${name}: the page scrolls sideways by ${overflow}px`);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

const db = new pg.Client({ connectionString: DB_URL });
await db.connect();
const resetTables = () =>
  db.query(
    "truncate users, accounts, sessions, verification_tokens, email_status, rate_limit_hits, signups cascade",
  );

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const scheme of ["light", "dark"]) {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    const suffix = `${device}-${scheme}`;
    const context = await browser.newContext({
      viewport,
      colorScheme: scheme,
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
      hasTouch: device === "mobile",
      isMobile: device === "mobile",
    });
    await stubCustomerio(context);
    const page = await context.newPage();

    await resetTables();
    await page.goto(BASE_URL);
    await shoot(page, `landing-${suffix}`);

    // The theme menu, open. Viewport only: it sits at the top.
    await page
      .getByRole("button", { name: /^Theme/ })
      .first()
      .click();
    await page.getByRole("menu", { name: "Theme" }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, `theme-menu-${suffix}.png`) });
    console.log(path.join(OUT, `theme-menu-${suffix}.png`));
    await page.keyboard.press("Escape");

    // A new workspace: Customer.io has not approved it for sending yet.
    setMode("not_approved");
    await page.goto(`${BASE_URL}/sign-in`);
    await page.getByLabel("Email").fill(OWNER_EMAIL);
    await page.getByRole("button", { name: "Continue with email" }).click();
    await page.waitForURL("**/check-email");
    await shoot(page, `check-email-${suffix}`);

    await page.goto(`${BASE_URL}/sign-in`);
    await page.getByText("Sign-in emails aren’t on yet").waitFor();
    await shoot(page, `sign-in-not-ready-${suffix}`);

    await page.goto(lastLink());
    await page.waitForURL("**/dashboard");
    await page.waitForTimeout(800); // the signup steps run after the response
    await page.reload();
    await page.getByRole("button", { name: /^Inbox/ }).click();
    await page.getByText("Your workspace is ready").waitFor();
    await shoot(page, `dashboard-inbox-${suffix}`);
    await page.keyboard.press("Escape");

    await page.goto(`${BASE_URL}/status`);
    await shoot(page, `status-not-ready-${suffix}`);

    // Once a send works, the state flips to ready.
    await db.query(
      "update email_status set state = 'ready', reason = null, message = null, http_status = null, checked_at = now()",
    );
    await page.goto(`${BASE_URL}/status`);
    await shoot(page, `status-ready-${suffix}`);

    setMode("ok");
    await context.close();
  }
}

await browser.close();
await db.end();
