/**
 * Applies the SQL files in drizzle/ that have not run yet. `pnpm build` runs
 * this first, so every Vercel deploy (Production and each Preview branch that
 * Neon makes) has the tables it needs before the new code goes live.
 *
 * It uses the direct (unpooled) connection: migrations take a lock and run
 * DDL, which a transaction-mode pooler like PgBouncer does not support well.
 *
 *   pnpm db:migrate
 */
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { directDatabaseUrl } from "../lib/db/env.ts";
import { isDemo } from "../lib/demo.ts";

// Locally, read .env.local the way `next dev` does. Values already in the
// environment (on Vercel, or set in your shell) always win.
if (existsSync(".env.local")) {
  for (const [key, value] of Object.entries(parseEnv(readFileSync(".env.local", "utf8")))) {
    process.env[key] ??= value;
  }
}

const url = directDatabaseUrl();

if (!url && isDemo()) {
  console.log("[migrate] Demo mode runs without a database, so no migrations ran.");
  process.exit(0);
}

if (!url) {
  if (process.env.VERCEL === "1") {
    console.error(
      "[migrate] No database URL. Add Neon to this project (Storage tab in Vercel), then redeploy.",
    );
    process.exit(1);
  }
  console.log(
    "[migrate] No DATABASE_URL here, so no migrations ran. See README > Local development.",
  );
  process.exit(0);
}

const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10_000 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  console.log("[migrate] Database is up to date.");
} catch (error) {
  console.error("[migrate] Migration failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
