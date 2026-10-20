# Next.js SaaS starter with Customer.io

A small SaaS app you can deploy in one click and then make your own. It has:

- **Email sign-in** with a magic link (Auth.js). No passwords.
- **A Postgres database** on Neon, added for you when you deploy.
- **Customer.io** for the messages every SaaS needs on day one: the sign-in email, a welcome email, a note to you when someone signs up, and in-app messages with an inbox.

The app is called **Acme**. That is a placeholder name and logo. Change them in `lib/site.ts` and `components/logo.tsx`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcustomerio%2Fvercel-nextjs-starter&integration-ids=oac_PLACEHOLDER&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D&env=AUTH_SECRET&envDescription=A%20random%20secret%20for%20Auth.js.%20Run%20%60npx%20auth%20secret%60%20or%20%60openssl%20rand%20-base64%2033%60%20and%20paste%20the%20value.&envLink=https%3A%2F%2Fauthjs.dev%2Fgetting-started%2Finstallation%23setup-environment&project-name=acme-saas&repository-name=acme-saas)

**Demo:** `DEMO_URL_PLACEHOLDER`

| Landing page                                       | Sign-in, before email is set up                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| ![Landing page](docs/screenshots/landing.png)      | ![Sign-in with the email setup list](docs/screenshots/sign-in-not-ready.png) |
| **Dashboard with the inbox open**                  | **Status page**                                                              |
| ![Dashboard](docs/screenshots/dashboard-inbox.png) | ![Status page](docs/screenshots/status-not-ready.png)                        |

## Deploy

1. Click **Deploy with Vercel** above.
2. Vercel adds two integrations:
   - **Customer.io** connects a workspace and writes the `CUSTOMERIO_*` variables.
   - **Neon** creates a Postgres database and writes `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
3. Vercel asks you for one value, **`AUTH_SECRET`**. Make one with either command and paste it:

   ```sh
   npx auth secret          # prints a secret (and writes it to .env.local)
   openssl rand -base64 33
   ```

4. Vercel builds the app. The build creates the database tables first.
5. In the Vercel project, add **`OWNER_EMAIL`** with your own email, and redeploy. Only that person can open the status page.
6. Open your site and sign in with that email.

A brand-new Customer.io workspace can't send email yet, so your first sign-in link will not arrive. That is normal. To get in anyway, open a **Preview** deployment, where the link shows on the page, or run the app locally. Then open `/status` to see what is left to do. See [Email readiness](#email-readiness).

## How it works

```
Someone types their email
  └─ Auth.js makes a one-time link and calls our email provider (auth.ts)
       ├─ rate limit: 3 links per email, 10 per IP, per 15 minutes
       ├─ save the person in Postgres (not verified yet)
       ├─ send the link with the Transactional API
       │    └─ the answer is stored: "ready" or "blocked, and why"
       └─ Customer.io: identify (email_verified: false) + event signup_started

They open the link: that is the signup (only once per person, enforced in Postgres)
  ├─ identify (email_verified: true, created_at)
  ├─ event signed_up
  ├─ welcome email
  └─ a note to OWNER_EMAIL, if you set it

In the browser (when CUSTOMERIO_CDP_WRITE_KEY is set)
  ├─ page view on every route change
  ├─ identify with the same user ID as the server, reset on sign-out
  └─ in-app messages, and an inbox under the bell in the header
```

Some rules the code follows, so you can keep them when you change it:

- **Customer.io never blocks sign-in.** Every call returns a result and never throws. After sign-in, the Customer.io calls run in the background (`after()` in Next.js), so a slow answer can't slow the page.
- **The signup runs once.** One atomic database update marks a person as signed up. A second browser, a double click, or a retry does not send a second welcome email.
- **A stable ID per person.** Customer.io gets the user's ID from Postgres, never the email. The same ID is used before and after they confirm, and in the browser.
- **Secrets stay on the server.** Only the browser write key and site ID reach the browser. They are public by design, and they are passed from the server; there are no `NEXT_PUBLIC_` copies.
- **Sign-in links are not kept.** Link emails go out with click tracking off and message retention off, so the link is never rewritten or stored in Customer.io.
- **Timeouts on every call** (5 seconds). Identify and events retry once. Emails never retry, so a slow answer can't send two copies.

The code is small. Start here:

| Path                                              | What it does                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [`auth.ts`](auth.ts)                              | Auth.js: the Customer.io email provider, the rate limit, database sessions.                      |
| [`lib/flows/`](lib/flows)                         | The flows: link request, signup, "Check again". Each takes its dependencies, so tests use fakes. |
| [`lib/customerio/`](lib/customerio)               | Config, clients, error types, email readiness, built-in emails, browser SDK config.              |
| [`lib/db/`](lib/db)                               | Drizzle schema, queries, and the connection. SQL migrations are in [`drizzle/`](drizzle).        |
| [`components/customerio/`](components/customerio) | The browser SDK provider and the inbox.                                                          |
| [`app/(app)/status/`](<app/(app)/status>)         | The status page, for the owner only.                                                             |

### Choices, and why

- **Database sessions, not JWT.** The Drizzle adapter uses database sessions by default, so there is nothing extra to set up. The cookie only holds a random ID, and signing out really ends the session.
- **`pg` (node-postgres) as the driver.** It works with Neon on Vercel and with any plain Postgres on your laptop, so there is one code path. On Vercel's Fluid compute the pool is reused between requests, and `attachDatabasePool` closes idle connections. Neon's own serverless driver would need a proxy to talk to a local Postgres.
- **Migrations before the build.** `pnpm build` runs `node scripts/migrate.ts` and then `next build`. It uses `DATABASE_URL_UNPOOLED` (a direct connection), because migrations need a real session. The app itself uses the pooled `DATABASE_URL`.

## Environment variables

| Variable                           | Written by               | Needed                | What it is for                                                                                 |
| ---------------------------------- | ------------------------ | --------------------- | ---------------------------------------------------------------------------------------------- |
| `AUTH_SECRET`                      | You (Deploy Button asks) | Yes                   | Signs Auth.js cookies and hashes link tokens.                                                  |
| `DATABASE_URL`                     | Neon                     | Yes                   | Pooled Postgres URL the app uses.                                                              |
| `DATABASE_URL_UNPOOLED`            | Neon                     | Yes, for builds       | Direct Postgres URL for migrations.                                                            |
| `CUSTOMERIO_SITE_ID`               | Customer.io              | For people and events | Track API site ID. The browser also uses it for in-app messages.                               |
| `CUSTOMERIO_TRACK_API_KEY`         | Customer.io              | For people and events | Track API key. Server only.                                                                    |
| `CUSTOMERIO_APP_API_KEY`           | Customer.io              | For email             | App API key, send only. Production and Preview only.                                           |
| `CUSTOMERIO_WORKSPACE_ID`          | Customer.io              | No                    | Links the status page to your workspace.                                                       |
| `CUSTOMERIO_REGION`                | Customer.io              | Yes                   | `us` or `eu`. Picks the API hosts.                                                             |
| `CUSTOMERIO_CDP_WRITE_KEY`         | Customer.io              | For the browser SDK   | Public by design. US workspaces only for now.                                                  |
| `CUSTOMERIO_FROM_EMAIL`            | You                      | No                    | Sender address. Without it, Customer.io uses your verified domain's default sender.            |
| `OWNER_EMAIL`                      | You                      | Yes, for `/status`    | The owner: the only person who can open the status page. Also gets a note for each new signup. |
| `CUSTOMERIO_MAGIC_LINK_MESSAGE_ID` | You                      | No                    | Send a sign-in email you designed in Customer.io instead of the built-in one.                  |
| `CUSTOMERIO_WELCOME_MESSAGE_ID`    | You                      | No                    | Send a welcome email you designed in Customer.io instead of the built-in one.                  |

Neon also writes `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING`. The app accepts them if the `DATABASE_URL*` names are missing.

Every variable is explained in [`.env.example`](.env.example). The **status page** (`/status`) shows which ones are set, never their values.

## The status page

`/status` is for the owner: the signed-in person whose email is `OWNER_EMAIL`. Everyone else gets a 404. Without `OWNER_EMAIL`, local dev lets any signed-in person in; a deployed site shows a short note asking you to set it.

It shows email readiness with the setup checklist and **Check again**, whether the browser SDK loaded, what was sent to Customer.io when you signed up, and which variables are set.

## Email readiness

A new Customer.io workspace can't send email until three things are done. Customer.io checks them in this order and tells us the first one that is still open:

1. **Confirm the account owner's email.** Open the link Customer.io sent when you made the account.
2. **Get the account approved for sending.** Customer.io reviews new accounts. Fill in your account details in Customer.io to start. See [account verification](https://docs.customer.io/accounts/account-verification/).
3. **Verify a sending domain.** Add the DNS records Customer.io gives you. See [domain authentication](https://docs.customer.io/messaging/channels/email/deliverability/authentication/). To pick the exact sender, set `CUSTOMERIO_FROM_EMAIL` to an address on that domain.

The app never asks Customer.io about this directly. Every email it sends is also the check: the answer is stored in one database row (`email_status`). While email is blocked:

- Visitors see one calm line on the sign-in form ("Sign-in emails aren't on yet. Try again soon."). No setup details are ever shown to them.
- People can still ask for a link. They are saved, and Customer.io gets `signup_started`. The page tells them their email is saved and to try again soon.
- The status page shows you the checklist, with the open step marked.
- **You can still get in.** In local dev, the link prints in your terminal. On a Vercel **Preview** deployment, the link shows on the page with a "Preview only" label (only for `OWNER_EMAIL`, if you set it). Production never shows it. Previews are behind Vercel Authentication by default.

**Check again** (on the status page, owner only) sends one short test email to `OWNER_EMAIL` and stores the answer. While email is blocked, nothing arrives. The first time it works, you get one "Email works" note and the checklist goes away. It waits 30 seconds between checks.

Once any send works, the state flips to ready by itself. Emails that failed before that (like your own welcome email) are not sent again; the status page shows them as "Not sent".

## Get told about each signup

With `OWNER_EMAIL` set, the app emails you when someone confirms their email ("Acme has its first signup", then "New signup on Acme"). It skips your own signup.

For more than that, use the `signed_up` event instead: in Customer.io, make a [campaign](https://docs.customer.io/messaging/send/automations/overview/) that starts when a person performs `signed_up`, and send yourself an email from it. You can add a welcome series for the person in the same campaign, with no code change.

## Browser SDK, in-app messages, and the inbox

When `CUSTOMERIO_CDP_WRITE_KEY` is set, the app loads [`@customerio/cdp-analytics-browser`](https://docs.customer.io/integrations/data-in/connections/javascript/js-source/) once, with the in-app plugin turned on through the site ID. Send an [in-app message](https://docs.customer.io/messaging/channels/in-app/getting-started/) and it shows in the app. Send an [inbox message](https://docs.customer.io/messaging/channels/in-app/inbox/) and it shows under the bell, with an unread count.

If an ad blocker stops the SDK, the app works the same. The status page says so.

## EU workspaces

Set `CUSTOMERIO_REGION=eu` (the integration does this). The server then talks only to the EU hosts (`track-eu.customer.io`, `api-eu.customer.io`), and the browser SDK uses `https://cdp-eu.customer.io`.

For now, the integration does not write a browser write key for EU workspaces. So in the EU, the browser SDK is off: page views, in-app messages, and the inbox wait for the key. Sign-in, server events, and email work as usual. The status page explains this.

## Local development

You need Node.js 24, pnpm, and a Postgres database.

**Option A: Docker**

```sh
docker run -d --name acme-postgres -e POSTGRES_PASSWORD=acme -p 5432:5432 postgres:17
```

Then in `.env.local`:

```sh
DATABASE_URL=postgres://postgres:acme@localhost:5432/postgres
DATABASE_URL_UNPOOLED=postgres://postgres:acme@localhost:5432/postgres
```

**Option B: a Neon branch.** Make a development branch in Neon, then copy your project's variables with the Vercel CLI:

```sh
vercel link
vercel env pull        # writes .env.local
```

Then:

```sh
pnpm install
pnpm db:migrate
pnpm dev
```

`pnpm db:migrate` reads `.env.local` like `pnpm dev` does, so the same file sets up both.

Open http://localhost:3000 and sign in. `CUSTOMERIO_APP_API_KEY` is only in Production and Preview, so locally no email goes out: **your sign-in link prints in the terminal** that runs `pnpm dev`.

Without any `CUSTOMERIO_*` variables the app still runs. It skips the Customer.io calls, and the status page says what is missing.

To try the whole flow without a real workspace, load the fake Customer.io in [`scripts/fake-customerio.mjs`](scripts/fake-customerio.mjs). It answers every server call locally, and you can switch it between "ok" and "not approved".

Scripts:

```sh
pnpm dev           # dev server
pnpm build         # migrate, then production build
pnpm db:generate   # new SQL migration after you change lib/db/schema.ts
pnpm db:migrate    # apply migrations
pnpm lint          # ESLint
pnpm typecheck     # TypeScript
pnpm test          # unit tests (Vitest, with an in-memory Postgres)
pnpm screenshots   # every page, desktop and phone
```

## Make it yours

- **Name and logo:** `lib/site.ts`, `components/logo.tsx`, `app/icon.svg`.
- **Colors:** the tokens at the top of `app/globals.css`.
- **Emails:** edit `lib/customerio/emails.ts`, or design them in Customer.io and set `CUSTOMERIO_MAGIC_LINK_MESSAGE_ID` / `CUSTOMERIO_WELCOME_MESSAGE_ID`. Your message gets `message_data` with `url`, `app_name`, `expires_in_minutes` (sign-in) or `app_name`, `dashboard_url` (welcome).
- **Your product:** start in `app/(app)/dashboard/page.tsx`.
- **Tables:** add them to `lib/db/schema.ts`, run `pnpm db:generate`, and commit the new file in `drizzle/`.
- **Fonts:** Figtree, loaded with `next/font` in `app/layout.tsx`.

## License

[MIT](LICENSE)
