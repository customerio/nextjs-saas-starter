import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, beforeEach } from "vitest";

import { schema } from "@/lib/db/schema";
import type { Db } from "@/lib/db/store";

/**
 * A Postgres in memory (PGlite) with the real migrations applied. Tests run
 * the same SQL the app runs, with no Docker and no network.
 *
 * One database per test file (starting one takes a few seconds); every table
 * is emptied before each test.
 */
export function setupTestDb(): () => Db {
  let db: Db | undefined;

  beforeAll(async () => {
    const instance = drizzle(new PGlite(), { schema });
    await migrate(instance, { migrationsFolder: path.join(import.meta.dirname, "../drizzle") });
    db = instance as unknown as Db;
  }, 60_000);

  beforeEach(async () => {
    await db!.execute(
      "truncate users, accounts, sessions, verification_tokens, email_status, rate_limit_hits, signups cascade",
    );
  });

  return () => db!;
}
