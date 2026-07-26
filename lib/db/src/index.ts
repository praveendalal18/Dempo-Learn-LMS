import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // In production keep TLS encryption on. We do NOT verify the CA
  // (rejectUnauthorized: false) because managed poolers — notably Supabase's
  // Supavisor — present a self-signed certificate in the chain, which strict
  // verification rejects with SELF_SIGNED_CERT_IN_CHAIN. Traffic is still
  // encrypted; local/CI Postgres (no TLS) leaves ssl off.
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
