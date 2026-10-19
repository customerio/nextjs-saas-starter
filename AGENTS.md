<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## This project

- All Customer.io code lives in `lib/customerio`. Keep it server-only (`import "server-only"`).
- Customer.io calls return a `StepResult` and never throw. Never let a Customer.io failure block sign-in or sign-up.
- Read `CUSTOMERIO_*` variables only through `getCustomerioConfig()`. Never show their values in the UI.
- Pick hosts with `sdkRegion()`. Never hardcode a US host.
- Use a stable person ID (`github-<id>`, `demo-<hash>`), never the email.
- Check with `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
