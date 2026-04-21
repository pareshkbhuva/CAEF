# AgnosLogic — Next.js

Production frontend and API for [agnoslogic.com](https://www.agnoslogic.com). Ports the original Flask app to Next.js 14 with TypeScript, NextAuth, and Vercel Postgres.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Auth**: NextAuth.js with Google OAuth
- **Database**: Vercel Postgres (via `@vercel/postgres`)
- **Hosting**: Vercel (Hobby tier compatible)
- **Inference backend**: RunPod serverless (unchanged, endpoint `hfwuj4fc8h3wr9`)

## Key architectural decision

This app runs on Vercel Hobby's **10-second function timeout** despite RunPod cold starts of up to 3 minutes. We use an async submit-and-poll pattern (see `lib/runpod.ts`):

```
Warm path (95% of requests):
  Client → /api/v1/ask → RunPod /runsync (completes in ~100ms) → response
  Total time: under 1 second

Cold path (first request after idle):
  Client → /api/v1/ask → RunPod /runsync times out at 7s → creates Job → returns { jobId, status: 'pending' }
  Client polls /api/jobs/{id} every 2s → each poll ~200ms → until RunPod completes
  Total time: 30-90 seconds for cold start, then warm
```

Every function call stays well under 10s. See `VERCEL_DEPLOYMENT.md` for the full explanation.

## Quick start

```bash
# Install
npm install

# Copy env template and fill in real values
cp .env.example .env.local

# Run locally (requires Vercel Postgres env vars in .env.local)
npm run dev

# Initialize DB schema
npm run db:init

# Build for production
npm run build
npm start
```

## Project structure

```
app/
  ├─ (marketing pages)
  │   page.tsx              # Homepage
  │   test/page.tsx         # Live demo with async polling client
  │   benchmarks/page.tsx
  │   docs/page.tsx
  │   compare/page.tsx
  │   use-cases/page.tsx
  │   changelog/page.tsx
  │   privacy/page.tsx
  │   terms/page.tsx
  ├─ dashboard/page.tsx     # Authenticated user dashboard with analytics
  ├─ admin/page.tsx         # Platform admin (ADMIN_EMAILS only)
  ├─ api/
  │   ├─ auth/[...nextauth]/route.ts
  │   ├─ v1/
  │   │   ├─ score/route.ts
  │   │   ├─ ask/route.ts
  │   │   ├─ compare/route.ts
  │   │   ├─ health/route.ts
  │   │   └─ usage/route.ts
  │   ├─ public/analyze/route.ts   # Live demo endpoint (no auth, IP rate-limited)
  │   ├─ jobs/[id]/route.ts        # Polling endpoint for async jobs
  │   └─ admin/users/[id]/plan/route.ts
  ├─ robots.ts
  ├─ sitemap.ts
  ├─ layout.tsx
  └─ globals.css

components/
  ├─ Nav.tsx
  ├─ Footer.tsx
  ├─ SessionProvider.tsx
  ├─ CopyKeyButton.tsx
  └─ PlanChangeForm.tsx

lib/
  ├─ db.ts                  # Postgres schema + queries
  ├─ auth.ts                # NextAuth config
  ├─ api-auth.ts            # Bearer token auth for /v1/*
  ├─ runpod.ts              # RunPod client (sync + async)
  ├─ helpers.ts              # verdict mapping, percentile, rate limits
  └─ types.d.ts             # NextAuth type extensions

scripts/
  └─ init-db.ts             # Creates Postgres tables

VERCEL_DEPLOYMENT.md        # Full deployment guide
```

## Environment variables

See `.env.example`. Required in production:

- `NEXTAUTH_SECRET` + `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
- `RUNPOD_API_KEY` + `RUNPOD_ENDPOINT_ID`
- `POSTGRES_*` — auto-populated when you connect Vercel Postgres
- `NEXT_PUBLIC_BASE_URL` — your public URL
- `ADMIN_EMAILS` — comma-separated list for `/admin` access

## Deployment

See `VERCEL_DEPLOYMENT.md` for step-by-step instructions including Postgres setup, OAuth configuration, custom domain, and the initial schema migration.

## License

Proprietary — © 2026 Agnos Research. US Provisional Patent filed March 23, 2026.
