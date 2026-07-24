# Deploying Dempo on Vercel

The app deploys as **one Vercel project**: the React SPA is served as static files
by Vercel's CDN, and the Express API runs as a **single serverless function**
(`api/index.ts`, which re-exports the app from `artifacts/api-server/src/app.ts`).
Everything is one origin, so Clerk cookies and relative `/api` calls keep working.

Config lives in [`vercel.json`](./vercel.json). You do the dashboard + env steps below.

## 1. Create the project
1. Vercel → **Add New → Project** → import the GitHub repo `praveendalal18/Dempo-Learn-LMS`.
2. **Root Directory:** leave as the repo root (`./`).
3. **Framework Preset:** Other (already forced via `vercel.json` → `framework: null`).
4. Build/Install/Output are taken from `vercel.json`:
   - Install: `corepack … pnpm install --no-frozen-lockfile`
   - Build: `pnpm --filter @workspace/dempo build`
   - Output: `artifacts/dempo/dist/public`
5. **Settings → General → Node.js Version → `22.x`** (Vercel's max; the code is Node-24-compatible but doesn't need 24).
6. **Region:** `vercel.json` pins the function to **Mumbai (`bom1`)** for data residency. (Pro plan required for region pinning.)

## 2. Environment variables (Settings → Environment Variables)
Set for **Production** (and Preview if you use it). Mark secrets as sensitive.

**Core**
| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon **pooled** connection string — see §3 |
| `APP_BASE_URL` | your Vercel URL, e.g. `https://dempo.vercel.app` (or custom domain) |
| `ADMIN_EMAILS` | your teaching email(s), comma-separated |

**Auth (Clerk)**
| `CLERK_PUBLISHABLE_KEY` | `pk_…` |
| `CLERK_SECRET_KEY` | `sk_…` |
| `VITE_CLERK_PUBLISHABLE_KEY` | same `pk_…` (baked into the web build) |

Leave `VITE_CLERK_PROXY_URL` **unset** (only needed for Clerk's advanced proxy).

**AI grading (Sarvam)** — set when you enable it
| `AI_GRADING_ENABLED` | `true` |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | `https://api.sarvam.ai/v1` |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | your Sarvam key |
| `AI_GRADING_MODEL` | `sarvam-105b` |

**Object storage (Cloudflare R2)** — set when you enable uploads
`STORAGE_ENDPOINT`, `STORAGE_REGION=auto`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`,
`STORAGE_SECRET_KEY`, `STORAGE_FORCE_PATH_STYLE=false`, `PRIVATE_OBJECT_DIR=private`,
`PUBLIC_OBJECT_SEARCH_PATHS=public`.

**Email (MSG91)** — optional: `MSG91_*` as in `.env.example`.

> Do **not** set `PORT` or `WEB_DIST_DIR`. The function uses `app.ts` (no `listen`),
> and Vercel's CDN serves the SPA — the Express static fallback stays off.

## 3. Database — use Neon's POOLED URL (important for serverless)
Serverless functions can open many short-lived connections. Use Neon's **pooled**
endpoint (host contains `-pooler`), from the Neon dashboard → Connection Details →
**Pooled connection**. Set that as `DATABASE_URL`. For true India residency, also
create/move the Neon project to a **Mumbai/Asia** region (currently US).

## 4. Deploy & verify
- Push to `main` (or click **Deploy**). Vercel builds the SPA and bundles the function.
- Check: `https://<your-app>/api/healthz` returns ok; sign in; open a course.

## Known first-deploy caveat
The function bundles the whole Express app + workspace packages via `@vercel/node`.
If the **build log** shows a bundling error (e.g. a `pino` worker transport or a
workspace-resolution issue), that's the one thing to watch. Fallback if needed:
prebuild the API to a self-contained bundle and import that from `api/index.ts`
instead of the source — paste the log and we'll switch to that.

## Serverless notes
- **AI grading** runs inside the request; `maxDuration` is 60s (raise via Fluid
  Compute up to 300s on Pro if Sarvam is slow).
- No background workers/timers/websockets — reminders/notifications materialize on
  request, so the app is serverless-friendly.
- The old Render setup (`render.yaml`) is left in the repo; delete it once Vercel is
  your source of truth, and point your domain at Vercel.
