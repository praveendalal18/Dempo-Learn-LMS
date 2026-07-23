# aipraveen.com

Student AI **learning-commerce** platform for Praveen Dalal — students buy 1-year
course access, practice on real projects, build a reviewed recruiter-facing
portfolio, enter competitions, and attend workshops; companies sponsor and hire;
the owner runs everything from an admin panel.

Built from the design handoff in `design_handoff_aipraveen_platform/`. This is a
standalone app, separate from the Dempo college LMS in the parent repo.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript**
- Plain CSS variables + inline styles (design is token-precise; no Tailwind)
- **Drizzle ORM / Postgres** schema targeting **Supabase (Mumbai / ap-south-1)**
- **Razorpay** payments (INR, `en-IN`), **MSG91** transactional email,
  **Cloudflare Stream** intended for video (player is a provider-agnostic stub)

## Running locally

```bash
corepack pnpm install
corepack pnpm dev          # http://localhost:3200  (see .claude/launch.json)
```

**Dev mode needs no external accounts.** With none of the env vars in
`.env.example` set, the app runs on:

- an **in-memory data store** (seeded with a demo learner + admin),
- **magic-link login links printed to the server console** (no mail provider),
- a **mock Razorpay checkout** that completes without a real charge.

Set the env vars to switch each piece to the real service — no code changes.

### Demo logins (dev)

Request a link from `/login`, then open the URL printed in the server console.

- `asha.menon@gmail.com` — learner with active / expiring / expired items + progress
- `praveen@aipraveen.com` — admin (`/admin`)

## What's implemented

- **Public site:** home, store (+ loading/error states), course & kit detail,
  work, competitions, practice, workshops, for-companies, testimonials,
  book & insights, about, login, checkout + success/failed.
- **Auth:** passwordless 15-minute magic links, httpOnly session cookies.
- **Commerce:** Razorpay-ready checkout, 1-year entitlements, renewal pricing
  (`round(price × pct/100 / 10) × 10`, default 45%), free products, competitions.
- **Learner app:** dashboard (continue-learning + library states), course player
  with server-persisted lesson progress, resource viewer (copyable prompts,
  dataset, watermark), renew, expired interstitial.
- **Portfolio:** owner view + public recruiter view (`/p/[slug]`, SEO).
- **Admin:** dashboard KPIs + chart, products, orders, access, submissions,
  testimonials, industry pipeline; 5 transactional email templates.

## Data layer

The app talks only to `lib/data.ts`, which delegates to one of two stores
(`lib/store/`): the **in-memory** store (dev, no setup) or the **Drizzle/Postgres**
store (when `DATABASE_URL` is set — Supabase). Same async interface, so switching
is just an env var. The DB store is verified end-to-end against real Postgres
via `pnpm verify:db` (runs against in-process PGlite — no cloud DB needed).

## Going to production

1. **Database:** provision Supabase (Mumbai), set `DATABASE_URL`, run
   `pnpm db:push` (or `db:migrate`) to create the tables, then `pnpm db:seed` to
   create the admin account. The app now uses Postgres automatically.
2. **Payments:** add Razorpay keys → checkout switches from mock to the real
   widget + webhook (`/api/razorpay/webhook`).
3. **Email:** add MSG91 keys + templates → emails send for real (`lib/email.ts`).
4. **Video:** wire Cloudflare Stream signed playback into the player's
   `VideoArea` stub.
