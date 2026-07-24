# Migration Runbook — Neon → Supabase (Mumbai)

Move the **database** and **file storage** to Supabase (region **`ap-south-1` / Mumbai**),
on the **Pro** plan. **Auth stays on Clerk** (unchanged) and **Realtime/RLS are not used**.

- **App code changes required: none** beyond what's already merged (the object-path
  normalization fix, commit `baae834`).
- **Downtime:** a few minutes, during the final dump→switch. Do it when no students are active.
- **Rollback:** point `DATABASE_URL` back at Neon and redeploy (seconds).

> 🔐 **Secret handling:** connection strings and storage keys are secrets. Paste them
> **only** into the Supabase dashboard, Vercel env vars, or your local `.env`
> (git-ignored) — **never** into chat, commits, or logs. If one leaks, rotate it.

---

## Prerequisites

You need the Postgres client tools (`pg_dump`, `psql`) v16+. Check:

```bash
psql --version   # expect 16.x or 17.x
```

If they're missing on Windows, use Docker for the dump/restore step (shown inline below),
or install "PostgreSQL 17" and add its `bin` to PATH.

---

## Phase 0 — Create the Supabase project (no downtime)

1. Create a Supabase project: **Region = South Asia (Mumbai) `ap-south-1`**, **Plan = Pro**.
2. Set a strong database password when prompted (store it in your password manager).
3. Collect these from **Project Settings → Database → Connection string**:
   - **Session pooler** URI (port **5432**) — used for the migration/DDL.
   - **Transaction pooler** URI (port **6543**) — used by the app at runtime.

   They look like:
   ```
   # SESSION (migrations):
   postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
   # TRANSACTION (app runtime):
   postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```
4. Create the storage bucket: **Storage → New bucket** → name `dempo`, **Private**.
   Then **Storage → Settings** → raise the **file size limit** to fit your largest
   upload (e.g. `200MB` for video submissions).
5. Create S3 keys: **Storage → Settings → S3 access keys → New access key**.
   Save the **Access key ID** and **Secret** (shown once).
   Note the **S3 endpoint**: `https://<PROJECT_REF>.supabase.co/storage/v1/s3`.

---

## Phase 1 — Database

Set two shell variables locally (do **not** commit them):

```bash
export NEON_URL="<your current Neon DATABASE_URL>"
export SUPABASE_SESSION="postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

**1. Announce a short maintenance window** (so no writes happen mid-dump).

**2. Copy schema + data (one shot).** Native:

```bash
pg_dump "$NEON_URL" --no-owner --no-privileges --no-acl | psql "$SUPABASE_SESSION"
```

Or with Docker (if you don't have local pg tools):

```bash
docker run --rm postgres:17 sh -c \
  'pg_dump "'"$NEON_URL"'" --no-owner --no-privileges --no-acl' \
  | docker run --rm -i postgres:17 psql "$SUPABASE_SESSION"
```

Benign warnings about the `public` schema or extensions already existing are fine.
Watch for **errors** on `CREATE TABLE` / `COPY` — those matter.

**3. Reconcile the schema** against the code (safety net, also proves connectivity):

```bash
DATABASE_URL="$SUPABASE_SESSION" corepack pnpm --filter @workspace/db run push-force
```

Expect `[✓] Changes applied` with no/minimal diffs.

**4. Sanity-check row counts** match Neon (spot check a couple of tables):

```bash
psql "$SUPABASE_SESSION" -c "select
  (select count(*) from users) as users,
  (select count(*) from courses) as courses,
  (select count(*) from submissions) as submissions;"
```

**5. Point the app at Supabase.** In **Vercel → Settings → Environment Variables**,
set `DATABASE_URL` to the **transaction pooler** URI (port **6543**):

```
DATABASE_URL = postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
```

Also update your local `.env` `DATABASE_URL` to the **session** URI (5432) for local dev/migrations.

**6. Redeploy** (Deployments → ⋯ → Redeploy) and probe:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<your-app>.vercel.app/api/me
# expect 401 (healthy, unauthenticated) — NOT 500
```

> If you see a `prepared statement` error (rare with this stack): append `&pgbouncer=true`
> to the runtime `DATABASE_URL`. Not expected — `drizzle-orm/node-postgres` doesn't use
> named prepared statements.

---

## Phase 2 — Storage

In **Vercel** (and local `.env`), set:

```
STORAGE_ENDPOINT=https://<PROJECT_REF>.supabase.co/storage/v1/s3
STORAGE_REGION=ap-south-1
STORAGE_BUCKET=dempo
STORAGE_ACCESS_KEY=<supabase S3 access key id>
STORAGE_SECRET_KEY=<supabase S3 secret>
STORAGE_FORCE_PATH_STYLE=true
PRIVATE_OBJECT_DIR=private
PUBLIC_OBJECT_SEARCH_PATHS=public
```

`STORAGE_FORCE_PATH_STYLE=true` is **mandatory** (Supabase S3 is path-style only).
`PRIVATE_OBJECT_DIR` / `PUBLIC_OBJECT_SEARCH_PATHS` are key prefixes inside the one bucket;
keep whatever you used before (defaults above are fine).

**Redeploy**, then run the **upload smoke test** (the one thing that must be verified live):

1. Sign in as a teacher, create an assignment, attach a file → save.
2. Sign in as a student in that course, open the assignment, upload a file submission.
3. Confirm: the upload succeeds, and downloading it returns the file
   (as a download/attachment). In the DB, the stored reference should look like
   `/objects/uploads/<uuid>`:
   ```bash
   psql "$SUPABASE_SESSION" -c "select files from submissions order by id desc limit 1;"
   ```
4. If uploads fail: check the browser Network tab for the PUT to
   `...supabase.co/storage/v1/s3/...` — a 403 usually means wrong S3 key or the bucket
   name doesn't match `STORAGE_BUCKET`; a 413 means raise the bucket file-size limit.

---

## Phase 3 — Cut-over verification

Run through this checklist on the live site after both phases:

- [ ] `GET /api/me` returns 401 (not 500)
- [ ] Login works (Clerk — unchanged)
- [ ] Dashboard loads with data
- [ ] Create course / assignment
- [ ] Student submits an assignment **with a file** → teacher can download it
- [ ] Gradebook, Analytics, Discussion, Attendance pages load
- [ ] Notifications appear
- [ ] CI is still green (no code changed, but confirm)

Keep the **Neon project paused (not deleted)** for ~1–2 weeks as a safety net.

---

## Rollback

If anything is wrong after cut-over:

1. Set Vercel `DATABASE_URL` back to the Neon connection string.
2. (If you already switched storage and uploaded new files to Supabase, those specific
   new files won't be on R2/Neon — but reverting `DATABASE_URL` restores all data written
   before cut-over.)
3. Redeploy. Recovery time is essentially one redeploy.

---

## Gotchas (summary)

| Thing | Do this |
|---|---|
| App runtime DB URL | **Transaction** pooler, port **6543** |
| Migrations / `drizzle-kit push` / `psql` | **Session** pooler, port **5432** |
| Supabase S3 | `STORAGE_FORCE_PATH_STYLE=true` (path-style only) |
| Free tier pauses after ~7 days idle | Use **Pro** (always-on) — already planned |
| Bucket file-size limit | Raise it to fit videos/large attachments |
| RLS | Leave **off** — the Express API enforces authz over one service connection |
| Auth | **No change** — stays on Clerk |
| TLS | Keep `?sslmode=require`; the app already enforces verified TLS in production |

---

## What you are NOT changing

- **Clerk** (auth, sessions, password reset, invite-only flow) — untouched.
- **Application code** — untouched (the storage layer is already endpoint-agnostic).
- **Vercel hosting / functions / CI** — untouched.
