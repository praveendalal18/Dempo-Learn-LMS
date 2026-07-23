/**
 * Seeds the production database with the admin account so the owner can reach
 * /admin. Real learners sign up themselves via magic link.
 *
 *   # PowerShell:  $env:DATABASE_URL="postgres://..."; corepack pnpm db:seed
 *   # bash:        DATABASE_URL="postgres://..." corepack pnpm db:seed
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../lib/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

async function main() {
  const client = postgres(url as string, { prepare: false });
  const db = drizzle(client, { schema });

  await db
    .insert(schema.users)
    .values({
      email: "praveen@aipraveen.com",
      name: "Praveen Dalal",
      isAdmin: true,
      slug: "praveen-dalal",
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: { isAdmin: true },
    });

  console.log("✅ Seeded admin user: praveen@aipraveen.com (isAdmin = true)");
  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
