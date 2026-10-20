<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## This project

A Next.js SaaS starter: Auth.js email magic links, Neon Postgres (Drizzle), and Customer.io (server SDK + browser SDK). "Acme" is a placeholder brand; Customer.io appears only as "Powered by Customer.io" and on `/status`.

### Rules

- Customer.io calls return a `StepResult` (`lib/customerio/steps.ts`) and never throw. Never let a Customer.io failure block sign-in or sign-up. Slow work after sign-in goes through `deps.defer` (`after()`).
- Flows live in `lib/flows/` and take a `FlowDeps`. Build the real one with `defaultDeps()`; tests pass fakes (`tests/fakes.ts`).
- Read `CUSTOMERIO_*` variables only through `getCustomerioConfig()`. Never render their values.
- Only the CDP write key and site ID may reach the browser, as props built by `browserSdkState()`. No `NEXT_PUBLIC_` variables.
- Pick hosts with `sdkRegion()` (server) and `cdnUrlFor()` (browser). Never hardcode a US host.
- Customer.io person ID = `users.id`, never the email.
- The signup runs once, guarded by `claimSignup()` (an atomic UPDATE). Keep that guard if you change the flow.
- Every email send goes through `recordSendOutcome()` so email readiness stays current.
- The sign-in link may be shown on a page only when `mayRevealLink()` allows it (Vercel Preview, email not sent). Never in Production.
- Schema changes: edit `lib/db/schema.ts`, run `pnpm db:generate`, commit the SQL in `drizzle/`.

### Checks

```sh
pnpm lint && pnpm typecheck && pnpm test
```

Tests use PGlite (in-memory Postgres) with the real migrations; no Docker needed.

To run the app without a real Customer.io workspace, preload the fake:
`FAKE_CIO_DIR=/tmp/fake-cio NODE_OPTIONS="--import ./scripts/fake-customerio.mjs" pnpm dev`.
Write `ok`, `owner_unconfirmed`, `not_approved`, or `no_domain` to `$FAKE_CIO_DIR/mode`.
Never call real Customer.io from tests or scripts.

Check that every outside link still answers 200:

```sh
for u in $(grep -ohE 'https://(docs\.customer\.io|fly\.customer\.io|authjs\.dev)[^ )"`]*' README.md lib/links.ts); do printf '%s %s\n' "$(curl -sL -o /dev/null -w '%{http_code}' "$u")" "$u"; done
```
