import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  bigserial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * The database schema. Two groups of tables:
 *
 * 1. Auth.js tables (users, accounts, sessions, verification_tokens). Their
 *    columns follow the shape `@auth/drizzle-adapter` expects. You can add
 *    columns, but do not rename or remove the ones listed here.
 * 2. Small app tables for the Customer.io flow (email_status, rate_limit_hits,
 *    signups).
 *
 * After you change this file, run `pnpm db:generate` and commit the new SQL
 * in `drizzle/`. Deploys apply it before the build (see scripts/migrate.mjs).
 */

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

// --- Auth.js ------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  /** Set by Auth.js when the person clicks their first sign-in link. */
  emailVerified: timestamptz("email_verified"),
  image: text("image"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

/** Not used by email sign-in, but the adapter needs it. Ready for OAuth later. */
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<"oauth" | "oidc" | "email" | "webauthn">().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamptz("expires").notNull(),
});

/** Auth.js stores a hash of each sign-in link token here, never the link. */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamptz("expires").notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

// --- App ----------------------------------------------------------------------

/**
 * One row: what the last Customer.io email send told us about whether this
 * workspace can send. `state` is "ready" or "blocked"; no row means "not
 * checked yet".
 */
export const emailStatus = pgTable(
  "email_status",
  {
    id: smallint("id").primaryKey().default(1),
    state: text("state").$type<"ready" | "blocked">().notNull(),
    /** A FailureKind from lib/customerio/errors.ts when blocked. */
    reason: text("reason"),
    /** Customer.io's own words, cut to a safe length. */
    message: text("message"),
    httpStatus: integer("http_status"),
    checkedAt: timestamptz("checked_at").notNull().defaultNow(),
  },
  (table) => [check("email_status_single_row", sql`${table.id} = 1`)],
);

/** One row per sign-in link request, for rate limits. Old rows are pruned. */
export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** "email:<hash>" or "ip:<hash>". Never the raw email or IP. */
    bucket: text("bucket").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [index("rate_limit_hits_bucket_created_at").on(table.bucket, table.createdAt)],
);

/**
 * What this app sent to Customer.io for each person, step by step.
 *
 * `signed_up_at` is set exactly once, by an atomic UPDATE. Only the request
 * that sets it runs the signup steps, so a second browser or a double click
 * never sends a second welcome email.
 */
export const signups = pgTable("signups", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamptz("started_at").notNull().defaultNow(),
  signedUpAt: timestamptz("signed_up_at"),
  /** Step name -> StepRecord. See lib/signup/steps.ts. */
  steps: jsonb("steps").$type<Record<string, unknown>>().notNull().default({}),
});

/**
 * The app's one example resource. The UI calls it whatever `site.resource`
 * says (lib/site.ts), so renaming the labels needs no migration. Rename the
 * table too only if you want the database to match.
 */
export const projects = pgTable(
  "projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [index("projects_user_id_created_at").on(table.userId, table.createdAt)],
);

/**
 * The "Get started" checklist, one row per person. Each step's time is set
 * once (an UPDATE ... WHERE ... IS NULL), so its event is tracked once.
 */
export const onboarding = pgTable("onboarding", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  createdProjectAt: timestamptz("created_project_at"),
  openedInboxAt: timestamptz("opened_inbox_at"),
  invitedTeammateAt: timestamptz("invited_teammate_at"),
  completedAt: timestamptz("completed_at"),
  dismissedAt: timestamptz("dismissed_at"),
});

export const schema = {
  users,
  accounts,
  sessions,
  verificationTokens,
  emailStatus,
  rateLimitHits,
  signups,
  projects,
  onboarding,
};
