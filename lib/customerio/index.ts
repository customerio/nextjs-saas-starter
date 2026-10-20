/**
 * Customer.io for this app. The modules:
 *
 * - config.ts     reads and checks the CUSTOMERIO_* environment variables
 * - clients.ts    builds Track API and App API clients for the right region (server only)
 * - errors.ts     turns failures into typed values, incl. "this workspace can't send yet"
 * - steps.ts      StepResult: every call returns one, none throw
 * - track.ts      identify and events
 * - send.ts       transactional email
 * - emails.ts     the built-in email content
 * - readiness.ts  can this workspace send email yet, and what is left
 * - browser.ts    the public config for the browser SDK
 * - endpoints.ts  the URLs each step calls, for display
 *
 * Import from the module you need; this file is only a map.
 */
export {};
