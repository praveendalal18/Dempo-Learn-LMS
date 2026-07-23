# Dempo LMS — Path to First Sale

**Goal:** take the Dempo learning platform off Replit and make it genuinely sellable to a college of ~2,000 students in India — secure, compliant, reliable, and supportable.

**Owner key:** 🛠️ Engineering (Claude-assisted, code) · 👤 You (accounts, business, sign-off) · ⚖️ External (lawyer / auditor / vendor onboarding)

> **North-star sequencing:** get it running cheaply → run a free pilot with ONE department → in parallel clear the security + legal gates (long lead time) → then spend on HA/SSO/messaging only once a contract is real.

---

## Gap summary (from the CTO review)

| # | Gap | Severity | Workstream |
|---|-----|:---:|---|
| 1 | Still coupled to Replit (storage, AI, auth) | 🔴 Blocker to run | A |
| 2 | App can't email/message anyone | 🔴 High | A |
| 3 | Code never security-audited (AI-generated) | 🔴 Sale-blocker | C |
| 4 | No legal docs / DPDP compliance / DPAs | 🔴 Sale-blocker | D |
| 5 | No roster/bulk onboarding | 🟠 High | B |
| 6 | College SSO not set up (Clerk paid tier) | 🟠 High | B |
| 7 | No HA / tested DR / defined SLA | 🟠 Medium | C |
| 8 | No support model / on-call | 🟠 Medium | E |
| 9 | Exam integrity thin (plagiarism only) | 🟡 Medium | B |
| 10 | Accessibility unverified | 🟡 Medium | B |
| 11 | No monitoring wired | 🟡 Medium | C |
| 12 | No commercial model (pricing/contract/GST) | 🟠 High | E |

---

## Stage A — Get it off Replit and running (Week 1–2)

*Cheapest, fastest; unblocks everything. Mostly engineering.*

| Task | Owner | Notes |
|------|:---:|------|
| Rewrite `objectStorage.ts` → plain S3 API | 🛠️ | Target DO Spaces / S3-compatible; removes Replit sidecar dependency |
| Build AI grading as on/off **toggle**, wire Sarvam client | 🛠️ | Default OFF; base URL `https://api.sarvam.ai/v1`, model `sarvam-105b`. Add identity-stripping before send |
| Swap Clerk to your own keys, simplify multi-domain proxy | 🛠️ | Removes Replit-managed Clerk assumptions |
| Build **notification delivery layer** + wire MSG91 **email** | 🛠️ | Closes gap #2; fans out in-app + email (WhatsApp/SMS added later) |
| Create local `.env` files; run web + API locally | 🛠️👤 | You paste keys into `.env` (never into chat) |
| Run the existing test suite; fix breakages | 🛠️ | App already has tests — good baseline |
| Delete `.replit`, `.replitignore`, Replit-only config | 🛠️ | |
| **Accounts you create + keys:** DO, Clerk, Sarvam, MSG91 | 👤 | I'll give click-by-click steps |

**Exit criterion:** the app runs on your laptop against a cloud Postgres, uploads a file, sends a test email, tests pass. **This proves it's free of Replit.**

---

## Stage B — Deploy a pilot-grade instance + product gaps (Week 2–4)

| Task | Owner | Notes |
|------|:---:|------|
| Provision DO (App Platform + Postgres + Spaces), **Bangalore** | 👤🛠️ | You create; I configure |
| Push DB schema (Drizzle), deploy API + frontend | 🛠️ | |
| Buy domain, attach custom domain + HTTPS | 👤🛠️ | e.g. `learn.dempo.in` |
| **Bulk roster import** (CSV of students/courses) | 🛠️ | Gap #5 — critical for onboarding 2,000 users |
| **College SSO** (Google Workspace / Microsoft) via Clerk | 🛠️👤 | Gap #6 — needs Clerk paid tier; you approve the cost |
| **Exam robustness:** answer auto-save, server timer, reconnect | 🛠️ | Gap #9 — protects students on flaky WiFi |
| Accessibility first pass (keyboard, labels, contrast) | 🛠️ | Gap #10 — partial; full WCAG audit later |
| Smoke-test full flow end-to-end | 🛠️👤 | |

**Exit criterion:** a real, deployed instance one department can actually use.

---

## Stage C — Security & reliability (Week 2–6, runs in parallel)

*These are long-lead sale-blockers — start early.*

| Task | Owner | Notes |
|------|:---:|------|
| Internal security review (authz, file ACLs, input validation) | 🛠️ | First-pass; focus on roles/permissions (known concern) |
| Fix findings; add rate-limiting + abuse protection | 🛠️ | |
| **External penetration test** | ⚖️👤 | Gap #3 — commission a vendor; the report closes procurement |
| Wire **Sentry** (errors) + **UptimeRobot** (uptime) | 🛠️ | Gap #11 |
| Redundant API instances + Postgres standby (HA) | 👤🛠️ | Gap #7 — enables an SLA; spend only when pilot is promising |
| **Test** a backup restore; write a 1-page DR runbook | 🛠️👤 | Backups exist — but untested = useless |
| **Load-test** one exam spike (hundreds concurrent) | 🛠️ | Prove it survives finals week |

**Exit criterion:** a clean pen-test report + proven it stays up under exam load.

---

## Stage D — Legal & compliance (Week 1–8, mostly external — START NOW)

*Longest lead time. Kick off day one even though engineering runs ahead.*

| Task | Owner | Notes |
|------|:---:|------|
| Privacy Policy, Terms of Service, EULA | ⚖️👤 | Gap #4 |
| DPDP: consent capture in-app + data-retention/deletion policy | ⚖️🛠️ | Lawyer defines; I build the in-app consent flow |
| **Data Processing Agreements** with DO, Clerk, Sarvam, MSG91 | 👤 | Request from each vendor; keep in a compliance file |
| Cross-border note for Clerk (US-hosted identity) | ⚖️👤 | Decide: accept with consent, or plan India-resident auth later |
| **DLT registration** (SMS sender ID + templates, TRAI) | 👤 | Needed before SMS; MSG91 assists |
| **WhatsApp template approval** (via MSG91/Meta) | 👤 | Few days' approval |
| Email domain verification (SPF/DKIM) | 🛠️👤 | Quick; enables reliable email |

**Exit criterion:** signed policies + vendor DPAs + messaging registrations in hand.

---

## Stage E — Commercial & go-live (Week 6–10)

| Task | Owner | Notes |
|------|:---:|------|
| Pricing model (per-student/year vs flat) + margin check | 👤 | Gap #12 |
| Master Service Agreement / contract template | ⚖️👤 | |
| Invoicing + GST setup | 👤 | N/A — teaching-only tool, no in-app payments (Razorpay dropped) |
| **Support model:** channel + response-time SLA + on-call for exams | 👤🛠️ | Gap #8 — your hardest operational promise |
| Turn on WhatsApp/SMS notifications | 🛠️👤 | After DLT + template approval |
| Turn on AI grading (Sarvam), quality-test on real samples | 🛠️👤 | After compliance sign-off |
| Pilot → fix → full rollout to 2,000 | 👤🛠️ | |

---

## Cost model

### Recurring — monthly (₹ at ~₹86/$)

| Item | Lean (pilot) | Full (production) |
|------|---:|---:|
| API hosting (DO, redundant) | ₹2,200 | ₹4,300 |
| Managed Postgres (+ standby) | ₹1,300 | ₹4,300 |
| Object storage (grows over time) | ₹450 | ₹1,500 |
| Frontend (Cloudflare) | Free | Free |
| Clerk (with SSO) | Free | ₹2,200+ |
| MSG91 (email + WhatsApp/SMS) | ₹2,000 | ₹6,000 |
| Sarvam AI (when on) | ₹500 | ₹2,000 |
| Monitoring (Sentry/uptime) | Free | ₹2,200 |
| **Monthly total** | **~₹9,000 (~$105)** | **~₹22,800 (~$265)** |

### One-time / annual

| Item | Rough cost |
|------|---:|
| Security audit + penetration test | ₹75,000–2,00,000 |
| Legal docs (ToS, Privacy, DPA, DPDP) | ₹40,000–1,00,000 |
| DLT / WhatsApp registration | ~₹5,000 |
| Cyber insurance (optional, annual) | ₹30,000+/yr |

### Not on an invoice
Your **time**: support/on-call, maintenance, updates, per-college onboarding.

---

## What blocks the first sale (do these, in this order)

1. **Stage A** — get it running off Replit (cheap, fast).
2. **Start Stage D (legal) + pen test (Stage C) immediately** — longest lead time.
3. **Stage B** — deploy + roster import + SSO for a real pilot.
4. **Run a free pilot** with one department; gather proof + testimonials.
5. **Stage E** — price, contract, support; then sell and roll out.

**Don't buy HA / SSO / messaging volume until a pilot proves demand.** Keep monthly at ~₹9k until then.

---

## Architecture reference (settled)

- **Frontend:** Cloudflare Pages (global CDN)
- **API:** DigitalOcean App Platform — Bangalore (stateless, autoscaling)
- **Database:** DigitalOcean Managed Postgres — Bangalore (pooler + PITR backups)
- **File storage:** DigitalOcean Spaces — Bangalore (S3-compatible)
- **Auth:** Clerk (SSO on paid tier) — ⚠️ US-hosted identity data
- **AI grading:** Sarvam AI (Indian, India-hosted, OpenAI-compatible) — toggle, default off
- **Notifications:** MSG91 (Indian) — email + WhatsApp + SMS
- **Ops:** Sentry + UptimeRobot + staging env + tested backups

*All vendors India-friendly. Plagiarism detection runs locally — never leaves the country.*
