/**
 * Which connection string to use. The Neon integration on Vercel writes
 * `DATABASE_URL` (pooled, through PgBouncer) and `DATABASE_URL_UNPOOLED`
 * (direct). It also writes `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING` for
 * older Vercel Postgres templates, so we accept those as a fallback.
 *
 * - The app uses the pooled URL: many short serverless requests share a few
 *   real connections.
 * - Migrations use the direct URL: DDL and the migration lock need a real
 *   session, which a transaction-mode pooler does not give you.
 *
 * This file is shared with scripts/migrate.mjs, so it has no imports.
 */

type Env = Record<string, string | undefined>;

function first(env: Env, names: readonly string[]): string | null {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return null;
}

export const POOLED_URL_VARS = ["DATABASE_URL", "POSTGRES_URL"] as const;
export const DIRECT_URL_VARS = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
] as const;

export function pooledDatabaseUrl(env: Env = process.env): string | null {
  return first(env, POOLED_URL_VARS);
}

export function directDatabaseUrl(env: Env = process.env): string | null {
  return first(env, DIRECT_URL_VARS);
}
