/**
 * Lazy Postgres/Drizzle client. Only initialised when DATABASE_URL is set
 * (e.g. Supabase Mumbai in production). In dev the app uses the in-memory
 * store in lib/data.ts, so this stays uninitialised and adds no overhead.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isDbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — the app is using the dev store.");
  }
  if (!_db) {
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export { schema };
