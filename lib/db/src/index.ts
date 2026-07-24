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
  // In production require verified TLS so a misconfigured URL can't silently
  // fall back to plaintext. Left off elsewhere so local/CI Postgres (no TLS)
  // still connects.
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
