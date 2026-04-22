import { sql } from '@vercel/postgres'
import crypto from 'crypto'

// Check if database is configured
function isDatabaseConfigured(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL)
}

/**
 * Database schema initialization.
 * Called on first load or via scripts/init-db.ts
 */
export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      picture TEXT,
      google_id TEXT UNIQUE,
      api_key TEXT UNIQUE NOT NULL,
      plan TEXT DEFAULT 'free',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS usage (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT,
      latency_ms REAL DEFAULT 0,
      epsilon REAL DEFAULT 0,
      verdict TEXT,
      category TEXT,
      text_sample TEXT,
      success INTEGER DEFAULT 1,
      error_msg TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS public_demo_usage (
      id SERIAL PRIMARY KEY,
      ip_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  // Jobs table - tracks async RunPod jobs for Vercel Hobby tier (10s timeout workaround)
  await sql`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      runpod_job_id TEXT,
      endpoint TEXT,
      status TEXT DEFAULT 'queued',
      input_text TEXT,
      result JSONB,
      error_msg TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage(user_id, created_at)`
  await sql`CREATE INDEX IF NOT EXISTS idx_usage_created ON usage(created_at)`
  await sql`CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key)`
  await sql`CREATE INDEX IF NOT EXISTS idx_demo_ip ON public_demo_usage(ip_hash, created_at)`
  await sql`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, created_at)`
}

// ──────────────────────────────────────────────────────────
// User operations
// ──────────────────────────────────────────────────────────

export interface User {
  id: number
  email: string
  name: string | null
  picture: string | null
  google_id: string | null
  api_key: string
  plan: 'free' | 'builder' | 'enterprise'
  created_at: string
}

export function genApiKey(email: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret'
  const hash = crypto
    .createHash('sha256')
    .update(`${email}:${secret}:${Date.now()}`)
    .digest('hex')
  return `agnoslogic_${hash.slice(0, 32)}`
}

export function hashIp(ip: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret'
  return crypto
    .createHash('sha256')
    .update(`${ip}:${secret}`)
    .digest('hex')
    .slice(0, 32)
}

export async function upsertUser(params: {
  email: string
  name: string
  picture: string
  googleId: string
}): Promise<User | null> {
  if (!isDatabaseConfigured()) {
    // Return mock user when database is not available
    return {
      id: 0,
      email: params.email,
      name: params.name,
      picture: params.picture,
      google_id: params.googleId,
      api_key: genApiKey(params.email),
      plan: 'free',
      created_at: new Date().toISOString()
    }
  }
  const { email, name, picture, googleId } = params
  const existing = await sql<User>`SELECT * FROM users WHERE email = ${email}`
  if (existing.rows.length > 0) {
    const u = existing.rows[0]
    await sql`
      UPDATE users SET name = ${name}, picture = ${picture}, google_id = ${googleId}
      WHERE id = ${u.id}
    `
    return { ...u, name, picture, google_id: googleId }
  }
  const apiKey = genApiKey(email)
  const inserted = await sql<User>`
    INSERT INTO users (email, name, picture, google_id, api_key)
    VALUES (${email}, ${name}, ${picture}, ${googleId}, ${apiKey})
    RETURNING *
  `
  return inserted.rows[0]
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (!isDatabaseConfigured()) {
    return null
  }
  const result = await sql<User>`SELECT * FROM users WHERE email = ${email}`
  return result.rows[0] || null
}

export async function getUserByApiKey(apiKey: string): Promise<User | null> {
  const result = await sql<User>`SELECT * FROM users WHERE api_key = ${apiKey}`
  return result.rows[0] || null
}

export async function updateUserPlan(userId: number, plan: string): Promise<void> {
  await sql`UPDATE users SET plan = ${plan} WHERE id = ${userId}`
}

// ──────────────────────────────────────────────────────────
// Usage logging
// ──────────────────────────────────────────────────────────

export interface UsageLog {
  user_id: number
  endpoint: string
  latency_ms?: number
  epsilon?: number
  verdict?: string | null
  category?: string | null
  text_sample?: string | null
  success?: 0 | 1
  error_msg?: string | null
}

export async function logUsage(log: UsageLog): Promise<void> {
  await sql`
    INSERT INTO usage (
      user_id, endpoint, latency_ms, epsilon,
      verdict, category, text_sample, success, error_msg
    ) VALUES (
      ${log.user_id}, ${log.endpoint},
      ${log.latency_ms || 0}, ${log.epsilon || 0},
      ${log.verdict || null}, ${log.category || null},
      ${log.text_sample || null}, ${log.success ?? 1},
      ${log.error_msg || null}
    )
  `
}

export async function countTodayUsage(userId: number): Promise<number> {
  const result = await sql<{ n: string }>`
    SELECT COUNT(*) as n FROM usage
    WHERE user_id = ${userId}
      AND DATE(created_at) = CURRENT_DATE
      AND success = 1
  `
  return parseInt(result.rows[0].n, 10)
}

export async function countMonthUsage(userId: number): Promise<number> {
  const result = await sql<{ n: string }>`
    SELECT COUNT(*) as n FROM usage
    WHERE user_id = ${userId}
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
      AND success = 1
  `
  return parseInt(result.rows[0].n, 10)
}

// ──────────────────────────────────────────────────────────
// Public demo (IP rate limit)
// ──────────────────────────────────────────────────────────

export async function checkPublicDemoLimit(ipHash: string, limit: number): Promise<boolean> {
  const result = await sql<{ n: string }>`
    SELECT COUNT(*) as n FROM public_demo_usage
    WHERE ip_hash = ${ipHash}
      AND DATE(created_at) = CURRENT_DATE
  `
  const used = parseInt(result.rows[0].n, 10)
  return used < limit
}

export async function recordPublicDemoCall(ipHash: string): Promise<void> {
  await sql`INSERT INTO public_demo_usage (ip_hash) VALUES (${ipHash})`
}

// ──────────────────────────────────────────────────────────
// Jobs (async RunPod pattern)
// ──────────────────────────────────────────────────────────

export interface Job {
  id: string
  user_id: number | null
  runpod_job_id: string | null
  endpoint: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  input_text: string
  result: any | null
  error_msg: string | null
  created_at: string
  completed_at: string | null
}

export async function createJob(params: {
  userId: number | null
  endpoint: string
  inputText: string
  runpodJobId: string
}): Promise<string> {
  const id = crypto.randomUUID()
  await sql`
    INSERT INTO jobs (id, user_id, runpod_job_id, endpoint, status, input_text)
    VALUES (
      ${id}, ${params.userId}, ${params.runpodJobId},
      ${params.endpoint}, 'running', ${params.inputText.slice(0, 500)}
    )
  `
  return id
}

export async function getJob(id: string): Promise<Job | null> {
  const result = await sql<Job>`SELECT * FROM jobs WHERE id = ${id}`
  return result.rows[0] || null
}

export async function updateJobResult(
  id: string,
  result: any,
  status: 'completed' | 'failed' = 'completed',
  errorMsg: string | null = null
): Promise<void> {
  await sql`
    UPDATE jobs
    SET status = ${status},
        result = ${JSON.stringify(result)}::jsonb,
        error_msg = ${errorMsg},
        completed_at = NOW()
    WHERE id = ${id}
  `
}
