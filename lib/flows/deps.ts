import type { CustomerioConfig } from "@/lib/customerio/config";
import type { Mailer } from "@/lib/customerio/send";
import type { Tracker } from "@/lib/customerio/track";
import type { Db } from "@/lib/db/store";

/**
 * Everything the flows need from the outside world. The app builds the real
 * one in `default-deps.ts`; tests pass fakes and an in-memory database.
 */
export interface FlowDeps {
  db: Db;
  config: CustomerioConfig;
  track: Tracker | null;
  app: Mailer | null;
  now: () => Date;
  appName: string;
  /** Public URL of this deployment, without a trailing slash. */
  siteUrl: string;
  /** Vercel's VERCEL_ENV ("production" | "preview" | "development"), or null off Vercel. */
  vercelEnv: string | null;
  /** True for `next dev`. */
  isDev: boolean;
  /**
   * Runs work after the response is sent. The app uses Next.js `after()`, so
   * slow Customer.io calls never hold up a page. Tests run it right away.
   */
  defer: (task: () => Promise<void>) => void;
  log: Pick<Console, "info" | "warn">;
}
