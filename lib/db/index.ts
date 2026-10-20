import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { pooledDatabaseUrl } from "./env";
import { schema } from "./schema";

/**
 * One connection pool per server process, over plain TCP with `pg`.
 *
 * `pg` talks to any Postgres: Neon on Vercel and a local Docker container work
 * the same way, so there is one code path. On Vercel (Fluid compute) the pool
 * is reused across requests, and `attachDatabasePool` closes idle connections
 * before a function instance is suspended.
 */

export type Database = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let database: Database | undefined;

export class MissingDatabaseError extends Error {
  constructor() {
    super(
      "No database connection string. Set DATABASE_URL (the Neon integration does this on Vercel). " +
        "For local dev, see the README.",
    );
    this.name = "MissingDatabaseError";
  }
}

export function hasDatabase(): boolean {
  return pooledDatabaseUrl() !== null;
}

export function getDb(): Database {
  if (database) return database;
  const connectionString = pooledDatabaseUrl();
  if (!connectionString) throw new MissingDatabaseError();

  pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
  });
  attachDatabasePool(pool);
  database = drizzle(pool, { schema });
  return database;
}
