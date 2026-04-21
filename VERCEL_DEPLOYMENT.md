# AgnosLogic — Vercel Deployment Guide

Complete step-by-step deployment to Vercel Hobby (free) tier with Vercel Postgres.

---

## Architecture overview

This Next.js app is structured to work within Vercel Hobby's 10-second function timeout, despite RunPod cold starts taking up to 3 minutes.

**The async polling pattern** (see `lib/runpod.ts`):

1. Client calls an API endpoint (e.g. `/api/v1/ask`)
2. Route handler calls RunPod `/runsync` with a 7-second timeout
3. **Warm path** (most requests): RunPod returns the result within 7s → synchronous response
4. **Cold path** (first request after idle): `/runsync` returns a job ID without completing → route handler creates a Job record in Postgres and returns `{ jobId, status: 'pending' }` with HTTP 202
5. Client polls `GET /api/jobs/{jobId}` every 2 seconds
6. Each poll calls RunPod `/status/{id}` (~200ms) → when COMPLETED, result is stored and returned

Every function call stays well under the 10s ceiling. This works indefinitely on Hobby tier.

---

## 1. Prerequisites

- Node.js 18.17+ installed locally
- Vercel account (free Hobby tier works)
- GitHub account (Vercel pulls from git)
- Google Cloud project with OAuth 2.0 configured
- RunPod endpoint running (you already have `hfwuj4fc8h3wr9`)
- Custom domain `agnoslogic.com` with DNS access

---

## 2. Initial setup

### Clone and install

```bash
# Unzip the agnoslogic-next/ folder into your repo
cd agnoslogic-next
npm install
```

### Create `.env.local` for local development

```bash
cp .env.example .env.local
# Edit .env.local with your actual secrets
```

### Push to GitHub

```bash
git init
git add .
git commit -m "Initial Next.js port"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/agnoslogic.git
git push -u origin main
```

**⚠️ Important:** Verify `.env.local` and `.env` are in `.gitignore`. They are — the generated `.gitignore` blocks them.

---

## 3. Deploy to Vercel

### Import project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework preset: **Next.js** (auto-detected)
4. Root Directory: leave as-is (the `agnoslogic-next` folder should be the repo root)
5. Don't deploy yet — we need environment variables first

### Add Vercel Postgres

1. In your new project, go to **Storage** tab
2. Click **Create Database** → **Postgres**
3. Name it `agnoslogic-db`, pick the region closest to your RunPod endpoint
4. Click **Connect to Project** — Vercel auto-populates these env vars:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

Don't worry about these — the `@vercel/postgres` package picks them up automatically.

### Add remaining environment variables

In **Settings → Environment Variables**, add these for **Production, Preview, and Development**:

| Variable | Value |
|---|---|
| `NEXTAUTH_SECRET` | Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://www.agnoslogic.com` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `RUNPOD_API_KEY` | Rotate the old one at runpod.io |
| `RUNPOD_ENDPOINT_ID` | `hfwuj4fc8h3wr9` |
| `NEXT_PUBLIC_BASE_URL` | `https://www.agnoslogic.com` |
| `ADMIN_EMAILS` | `pareshbhuva@agnoslogic.com,hello@agnoslogic.com` |

### Deploy

Click **Deploy**. First build takes ~2 minutes.

---

## 4. Initialize the database schema

After first deploy, the Postgres tables don't exist yet. Two ways to create them:

### Option A: Run the init script locally

```bash
# Pull Vercel's env vars into your local machine
npx vercel link   # link to the deployed project
npx vercel env pull .env.local

# Now run the init script
npm run db:init
```

Output should read `✓ Schema initialized successfully`.

### Option B: Use Vercel's Query tab

1. Go to **Storage** → your Postgres database
2. Click the **Query** tab
3. Paste the CREATE TABLE statements from `lib/db.ts` manually

---

## 5. Google OAuth configuration

In [Google Cloud Console](https://console.cloud.google.com):

1. **APIs & Services → Credentials → OAuth 2.0 Client IDs**
2. Click your OAuth client
3. Under **Authorized redirect URIs**, add:
   - `https://www.agnoslogic.com/api/auth/callback/google`
   - `https://agnoslogic.com/api/auth/callback/google`
   - Your Vercel preview URL for testing: `https://agnoslogic-<hash>.vercel.app/api/auth/callback/google`
4. Save

Test by going to your deployed site and clicking "Get API key" — you should be redirected to Google, then back to `/dashboard`.

---

## 6. Custom domain

1. In Vercel, **Settings → Domains**
2. Add both `agnoslogic.com` and `www.agnoslogic.com`
3. Vercel shows you DNS records to add. At your domain registrar:

```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

Or use Vercel's nameservers for simpler management.

4. Wait 10 minutes for DNS propagation and cert provisioning
5. Vercel issues a free Let's Encrypt cert automatically

---

## 7. Test the deployment

After DNS is live, run through this checklist:

- [ ] Visit `https://www.agnoslogic.com` — homepage loads
- [ ] Visit `https://www.agnoslogic.com/v1/health` — returns JSON
- [ ] Click "Sign in" → Google OAuth → redirected to `/dashboard`
- [ ] Dashboard shows your email and API key
- [ ] Visit `/test` — paste a claim, click "Check" — should return a verdict
  - First request will show "Warming up inference backend…" for up to 60s (cold start)
  - Subsequent requests return sub-second
- [ ] As `pareshbhuva@agnoslogic.com`, visit `/admin` — should load
- [ ] Non-admin users visiting `/admin` should get redirected
- [ ] Test API from curl:
  ```bash
  curl https://www.agnoslogic.com/v1/score \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"text":"The Great Wall is visible from space."}'
  ```

---

## 8. SEO setup

After deploy:

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://www.agnoslogic.com`
3. Verify via DNS TXT record or HTML meta tag
4. Submit sitemap: `https://www.agnoslogic.com/sitemap.xml`
5. Request indexing for homepage

Next.js handles `robots.txt` and `sitemap.xml` automatically (see `app/robots.ts` and `app/sitemap.ts`).

---

## 9. Monitoring

- **Logs**: Vercel dashboard → your project → **Logs** tab
- **Function invocations**: **Insights** tab shows invocation count, duration, errors
- **Postgres**: **Storage** → your DB → **Query** tab to inspect data
- **Error alerts**: Settings → Notifications

### Useful SQL for monitoring

```sql
-- Who's using the product?
SELECT email, plan, COUNT(u.id) as queries
FROM users usr
LEFT JOIN usage u ON u.user_id = usr.id
GROUP BY usr.id, email, plan
ORDER BY queries DESC;

-- How often do we hit cold starts?
SELECT DATE(created_at), COUNT(*) as cold_starts
FROM jobs
WHERE status IN ('completed','failed')
GROUP BY DATE(created_at);

-- Verdict distribution by day
SELECT DATE(created_at) as day, verdict, COUNT(*) as n
FROM usage
WHERE verdict IS NOT NULL AND success = 1
GROUP BY DATE(created_at), verdict
ORDER BY day DESC;
```

---

## 10. Hobby tier limits to watch

Vercel Hobby (free) has these caps:

- **Function execution time**: 10s per invocation (we engineered around this)
- **Function invocations**: 100,000/month included
- **Bandwidth**: 100 GB/month
- **Postgres**: 256 MB storage, 60 hours compute/month
- **Build minutes**: 6,000/month

For a product in early validation, Hobby is fine. You'll hit Postgres limits before anything else — each user takes ~2 KB, each query log is ~500 bytes. 256 MB = roughly 100K users + 400K query logs.

Upgrade to **Pro ($20/mo)** when you have paying customers:
- 60s function timeout (simpler code paths become possible)
- 1 TB bandwidth
- Better Postgres: 512 MB, 100 hours compute

---

## 11. Pending from prior audit

These are still your action items:

- [ ] **Rotate leaked secrets** — the `env_example.txt` in your old repo had real Google OAuth, RunPod, and Flask SECRET_KEY values committed. Rotate all three and scrub git history with `git filter-repo`.
- [ ] **Verify email DNS** — check `dig TXT agnoslogic.com` for SPF and `dig TXT _dmarc.agnoslogic.com` for DMARC. Without these, emails from `hello@agnoslogic.com` will often land in spam when you reach out to prospects.
- [ ] **Shut down Render** — once Vercel is confirmed working, cancel your Render service.

---

## 12. Common problems

**"OAuthAccountNotLinked" error after Google sign-in**
→ The email is already associated with a previous auth provider. Delete the user from the `users` table and try again.

**First `/test` request times out forever**
→ Check RunPod dashboard — is the endpoint actually running? Are there cold-start worker failures? Check the `jobs` table for the failed record.

**Dashboard shows "0 queries" after you ran API calls**
→ Check that `logUsage` is being called. SSH into Postgres query tab: `SELECT * FROM usage ORDER BY id DESC LIMIT 5;`

**`/admin` redirects to `/dashboard` even though I'm the admin**
→ Check `ADMIN_EMAILS` env var matches your exact Google email. Case-sensitive match after lowercase normalization.

**Postgres `relation "users" does not exist`**
→ You didn't run the init script. Run `npm run db:init` locally with Vercel env pulled.
