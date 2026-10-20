# How the starter works

The details behind the [README](../README.md): the flows, the rules the code follows, email readiness, events, and the browser SDK.

## Flows

```
Someone types their email
  └─ Auth.js makes a one-time link and calls our email provider (../auth.ts)
       ├─ rate limit: 3 links per email, 10 per IP, per 15 minutes
       ├─ save the person in Postgres (not verified yet)
       ├─ send the link with the Transactional API
       │    └─ the answer is stored: "ready" or "blocked, and why"
       └─ Customer.io: identify (email_verified: false) + event signup_started

They open the link: that is the signup (only once per person, enforced in Postgres)
  ├─ identify (email_verified: true, created_at)
  ├─ event signed_up
  ├─ welcome email
  └─ a note to the owner, if there is one

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

| Path                                                 | What it does                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [`auth.ts`](../auth.ts)                              | Auth.js: the Customer.io email provider, the rate limit, database sessions.                      |
| [`lib/flows/`](../lib/flows)                         | The flows: link request, signup, "Check again". Each takes its dependencies, so tests use fakes. |
| [`lib/customerio/`](../lib/customerio)               | Config, clients, error types, email readiness, built-in emails, browser SDK config.              |
| [`lib/db/`](../lib/db)                               | Drizzle schema, queries, and the connection. SQL migrations are in [`drizzle/`](../drizzle).     |
| [`components/customerio/`](../components/customerio) | The browser SDK provider and the inbox.                                                          |
| [`app/(app)/status/`](<../app/(app)/status>)         | The status page, for the owner only.                                                             |

## Choices, and why

- **Database sessions, not JWT.** The Drizzle adapter uses database sessions by default, so there is nothing extra to set up. The cookie only holds a random ID, and signing out really ends the session.
- **`pg` (node-postgres) as the driver.** It works with Neon on Vercel and with any plain Postgres on your laptop, so there is one code path. On Vercel's Fluid compute the pool is reused between requests, and `attachDatabasePool` closes idle connections. Neon's own serverless driver would need a proxy to talk to a local Postgres.
- **Migrations before the build.** `pnpm build` runs `node scripts/migrate.ts` and then `next build`. It uses `DATABASE_URL_UNPOOLED` (a direct connection), because migrations need a real session. The app itself uses the pooled `DATABASE_URL`.

## Email readiness

A new Customer.io workspace can't send email to real people until four things are done. Customer.io checks the first three in this order and tells us the first one that is still open:

1. **Confirm the account owner's email.** Open the link Customer.io sent when you made the account.
2. **Get the account approved for sending.** Customer.io reviews new accounts. Fill in your account details in Customer.io to start. See [account verification](https://docs.customer.io/accounts/account-verification/).
3. **Verify a sending domain.** Add the DNS records Customer.io gives you. See [domain authentication](https://docs.customer.io/messaging/channels/email/deliverability/authentication/). To pick the exact sender, set `CUSTOMERIO_FROM_EMAIL` to an address on that domain.
4. **Turn off test mode.** New workspaces start in test mode: Customer.io accepts every email, but it only reaches the account owner, from a Customer.io test address. In your workspace settings, under "How do you want to send messages?", pick **Send messages normally**. See [message sending](https://docs.customer.io/accounts/workspaces/overview/#message-sending). The app can't see this setting (its key can only send), so the status page shows this step as "Can't check from here".

The app never asks Customer.io about this directly. Every email it sends is also the check: the answer is stored in one database row (`email_status`). While email is blocked:

- Visitors see one calm line on the sign-in form ("Sign-in emails aren't on yet. Try again soon."). No setup details are ever shown to them.
- People can still ask for a link. They are saved, and Customer.io gets `signup_started`. The page tells them their email is saved and to try again soon.
- The status page shows you the checklist, with the open step marked.
- **The owner can still get in.** On any Vercel deployment, the owner's link goes to the Vercel logs (see [First sign-in after deploying](../README.md#first-sign-in-after-deploying)); the sign-in page and the "Check your email" page show a quiet "Own this site?" line pointing there, the same for every visitor. In local dev, every link prints in your terminal. On a **Preview** deployment, the link also shows on the page with a "Preview only" label (only for the owner, if there is one). Production never shows a link on the page.

**Check again** (on the status page, owner only) sends one short test email to the owner and stores the answer. While email is blocked, nothing arrives. The first time it works, you get one "Email works" note and the checklist goes away. It waits 30 seconds between checks.

**If Customer.io answers "Do Not Send"** (403), the account isn't active: the trial ended, the account was suspended or cancelled, or the workspace is set to "Never send messages". The status page says "Your Customer.io account isn't active" and links to Customer.io and to [how billing works](https://docs.customer.io/accounts/billing/how-we-bill/). Visitors still see only the calm line, sign-in is never blocked, and the owner's link still goes to the logs.

**If emails don't arrive** even though the status page says email works: Customer.io can accept an email and still not deliver it. Test mode, the daily limit for new accounts, content checks, and your plan's monthly limit (or, on pay-as-you-go plans, available funds) all happen after the API says yes, so the app can't see them. Open **Deliveries** in your workspace to see what happened to each email, and see [why messages don't arrive](https://docs.customer.io/messaging/send/automations/troubleshoot/messages-not-sending/).

Once any send works, the state flips to ready by itself. Emails that failed before that (like your own welcome email) are not sent again; the status page shows them as "Not sent".

## Events this app sends

Every event goes to Customer.io from the server with the person's user ID, after the response, so a Customer.io problem never slows or fails what the person did. The pattern is one call in [`lib/flows/app-events.ts`](../lib/flows/app-events.ts):

```ts
track(deps, user.id, "project_created", { project_id: project.id, name: project.name });
```

| Event                       | When                                                                 | Properties                                                   |
| --------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| `signup_started`            | Someone asks for a sign-in link before they have an account          | none                                                         |
| `signed_up`                 | They open their first link (once per person)                         | `method: "email"`                                            |
| `project_created`           | They create one of the example resource                              | `project_id`, `name`                                         |
| `project_deleted`           | They delete one                                                      | `project_id`, `name`                                         |
| `teammate_invited`          | They enter a teammate's email in "Get started"                       | `invitee_email`                                              |
| `onboarding_step_completed` | A "Get started" step is done (once per step)                         | `step`: `create_project`, `open_inbox`, or `invite_teammate` |
| `onboarding_completed`      | Every step is done (once)                                            | none                                                         |
| Page views                  | Every route change, from the browser SDK (when the write key is set) | page URL, title                                              |

The person is identified before `signup_started` (`email`, `email_verified: false`) and again at `signed_up` (`email`, `email_verified: true`, `created_at`).

## Campaign ideas

- **Finish signing up:** starts on `signup_started`, waits a day, exits if `signed_up` happens. One email: "Your link expired. Here's a new way in."
- **Invite your teammate:** starts on `teammate_invited` and sends an email _to the invitee_ (use the `invitee_email` property as the recipient). The template never emails invitees itself, so you own the copy and timing.
- **First-week nudge:** starts on `signed_up`, waits three days, and sends a tip if `onboarding_completed` has not happened; stop it as soon as it does.

## Browser SDK, in-app messages, and the inbox

When `CUSTOMERIO_CDP_WRITE_KEY` is set, the app loads [`@customerio/cdp-analytics-browser`](https://docs.customer.io/integrations/data-in/connections/javascript/js-source/) once, with the in-app plugin turned on through the site ID. Send an [in-app message](https://docs.customer.io/messaging/channels/in-app/getting-started/) and it shows in the app. Send an [inbox message](https://docs.customer.io/messaging/channels/in-app/inbox/) and it shows under the bell, with an unread count.

If an ad blocker stops the SDK, the app works the same. The status page says so.

The app has no built-in messages: it shows whatever your workspace sends. To welcome new people inside the app:

1. In Customer.io, make a campaign that starts on `signed_up`.
2. Add an in-app message. Pick a modal, or choose **Inline** with element ID `dashboard-message` to place it at the top of the dashboard (the slot takes no space until a message arrives).
3. Send it. It appears the next time the person opens the app. Opening the bell counts for the "Check your inbox" step.
