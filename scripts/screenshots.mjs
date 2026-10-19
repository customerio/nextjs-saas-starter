/**
 * Takes the README screenshots: every page, light and dark, desktop and phone.
 *
 * It needs two running servers, so it never calls Customer.io:
 *
 *   BASE_URL   a server with no CUSTOMERIO_* variables. The script signs in with
 *              the demo form, so every Customer.io step is skipped.
 *   SETUP_URL  optional. A server with placeholder CUSTOMERIO_* values. The
 *              script does not sign in there. It sets a session cookie and a
 *              signup record directly, to show the "Finish setting up email"
 *              state a brand-new workspace sees.
 *   AUTH_SECRET  the SETUP_URL server's secret, used to make the session cookie.
 *   OUT        where to write the PNG files. Default: ./screenshots
 *
 *   pnpm screenshots
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";
import { encode } from "next-auth/jwt";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SETUP_URL = process.env.SETUP_URL;
const OUT = path.resolve(process.env.OUT ?? "screenshots");

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 375, height: 812 },
};

async function signInWithDemo(page) {
  await page.goto(`${BASE_URL}/sign-in`);
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/dashboard");
}

/** The state a new workspace is in: person and event sent, email blocked. */
async function addSetupCookies(context) {
  const personId = "demo-6b1c9e0f4a2d8c7e5b31";
  const sessionToken = await encode({
    token: { name: "Ada Lovelace", email: "ada@example.com", sub: personId, method: "demo" },
    secret: process.env.AUTH_SECRET,
    salt: "authjs.session-token",
  });
  const record = {
    v: 1,
    personId,
    region: "us",
    signedUpAt: new Date().toISOString(),
    report: {
      identify: { status: "done", detail: null },
      event: { status: "done", detail: null },
      email: {
        status: "failed",
        failure: {
          kind: "account_not_approved",
          status: 403,
          message:
            "Account is not yet approved for sending. Complete your account setup to start sending.",
        },
      },
    },
  };
  await context.addCookies([
    { name: "authjs.session-token", value: sessionToken, url: SETUP_URL, httpOnly: true },
    { name: "cio-starter-signup", value: JSON.stringify(record), url: SETUP_URL, httpOnly: true },
  ]);
}

async function shoot(page, name) {
  // Let fonts settle so the screenshot matches what people see.
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const scheme of ["light", "dark"]) {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    const suffix = `${device}-${scheme}`;
    const options = {
      viewport,
      colorScheme: scheme,
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
    };

    const context = await browser.newContext(options);
    const page = await context.newPage();
    await page.goto(BASE_URL);
    await shoot(page, `landing-${suffix}`);
    await page.goto(`${BASE_URL}/sign-in`);
    await shoot(page, `sign-in-${suffix}`);
    await signInWithDemo(page);
    await shoot(page, `dashboard-missing-env-${suffix}`);
    await context.close();

    if (SETUP_URL) {
      const setup = await browser.newContext(options);
      await addSetupCookies(setup);
      const setupPage = await setup.newPage();
      await setupPage.goto(`${SETUP_URL}/dashboard`);
      await setupPage.waitForURL("**/dashboard");
      await shoot(setupPage, `dashboard-email-setup-${suffix}`);
      await setup.close();
    }
  }
}

await browser.close();
