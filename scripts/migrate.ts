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
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { directDatabaseUrl } from "../lib/db/env.ts";

const url = directDatabaseUrl();

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
