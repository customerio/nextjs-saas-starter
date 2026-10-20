import { defineConfig } from "drizzle-kit";

import { directDatabaseUrl } from "./lib/db/env";

/**
 * `pnpm db:generate` turns changes in lib/db/schema.ts into a new SQL file in
 * drizzle/. Commit it. `pnpm db:migrate` (also run before every build) applies
 * the files that have not run yet.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: directDatabaseUrl() ?? "postgres://localhost:5432/acme" },
  strict: true,
});
