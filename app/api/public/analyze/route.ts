import { NextRequest, NextResponse } from 'next/server'
import { tryRunPodSync, submitRunPodJob } from '@/lib/runpod'
import {
  getClientIp,
  categoryToVerdict,
  PUBLIC_DEMO_DAILY_LIMIT,
} from '@/lib/helpers'
import crypto from 'crypto'

export const maxDuration = 10

// In-memory rate limiting fallback when database is unavailable
const inMemoryRateLimit = new Map<string, { count: number; date: string }>()

function hashIpLocal(ip: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret'
  return crypto
    .createHash('sha256')
    .update(`${ip}:${secret}`)
    .digest('hex')
    .slice(0, 32)
}

function checkInMemoryLimit(ipHash: string, limit: number): boolean {
  const today = new Date().toISOString().split('T')[0]
  const record = inMemoryRateLimit.get(ipHash)
  
  if (!record || record.date !== today) {
    return true // New day or new user
  }
  
  return record.count < limit
}

function recordInMemoryCall(ipHash: string): void {
  const today = new Date().toISOString().split('T')[0]
  const record = inMemoryRateLimit.get(ipHash)
  
  if (!record || record.date !== today) {
    inMemoryRateLimit.set(ipHash, { count: 1, date: today })
  } else {
    record.count++
  }
}

// Try to use database functions, fall back to in-memory
async function checkRateLimit(ipHash: string, limit: number): Promise<boolean> {
  try {
    const { checkPublicDemoLimit } = await import('@/lib/db')
    return await checkPublicDemoLimit(ipHash, limit)
  } catch (err) {
    // Database not available, use in-memory fallback
    console.log('[v0] Database unavailable, using in-memory rate limiting')
    return checkInMemoryLimit(ipHash, limit)
  }
}

async function recordCall(ipHash: string): Promise<void> {
  try {
    const { recordPublicDemoCall } = await import('@/lib/db')
    await recordPublicDemoCall(ipHash)
  } catch (err) {
    // Database not available, use in-memory fallback
    recordInMemoryCall(ipHash)
  }
}

async function saveJob(params: {
  userId: number | null
  runpodJobId: string
  endpoint: string
  inputText: string
}): Promise<string | null> {
  try {
    const { createJob } = await import('@/lib/db')
    return await createJob(params)
  } catch (err) {
    // Database not available, return RunPod job ID as fallback
    console.log('[v0] Database unavailable, returning RunPod job ID directly')
    return params.runpodJobId
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const mode = body.mode as 'score' | 'ask'
    const text = (body.text || '').toString().trim()

    if (!text) {
      return NextResponse.json({ error: 'Please provide some text to analyze' }, { status: 400 })
    }
    if (text.length > 2000) {
      return NextResponse.json(
        { error: 'Text is too long (max 2000 characters). For longer content, sign up for an API key.' },
        { status: 400 }
      )
    }
    if (mode !== 'score' && mode !== 'ask') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    // IP rate limit (with fallback)
    const ipHash = hashIpLocal(getClientIp(req))
    const allowed = await checkRateLimit(ipHash, PUBLIC_DEMO_DAILY_LIMIT)
    if (!allowed) {
      return NextResponse.json(
        {
          error: `Daily demo limit reached (${PUBLIC_DEMO_DAILY_LIMIT}/day). Sign up free for 15 queries per day.`,
        },
        { status: 429 }
      )
    }
    await recordCall(ipHash)

    const payload =
      mode === 'score'
        ? { action: 'score' as const, text }
        : { action: 'generate_and_score' as const, question: text, max_tokens: 200 }

    // Try fast sync path first (warm RunPod completes in <2s typically)
    const syncResult = await tryRunPodSync(payload, 7000)

    if (syncResult?.output) {
      // Completed synchronously
      const out = syncResult.output
      const category = out.category || 'MED'
      const response = mode === 'ask' ? (out.response || out.generated || '') : undefined
      return NextResponse.json({
        category,
        verdict: categoryToVerdict(category),
        response,
      })
    }

    // If we got a pending ID, it means the job is queued - this is not an error
    if (syncResult?.pendingId) {
      const jobId = await saveJob({
        userId: null,
        runpodJobId: syncResult.pendingId,
        endpoint: `/public/${mode}`,
        inputText: text,
      })
      return NextResponse.json({ jobId: jobId || syncResult.pendingId, status: 'pending' })
    }

    if (syncResult?.error) {
      return NextResponse.json({ error: syncResult.error }, { status: 502 })
    }

    // Cold start path: runsync timed out, submit async job
    const submission = await submitRunPodJob(payload)
    if ('error' in submission) {
      return NextResponse.json({ error: submission.error }, { status: 502 })
    }

    const jobId = await saveJob({
      userId: null, // public demo, no user
      runpodJobId: submission.id,
      endpoint: `/public/${mode}`,
      inputText: text,
    })

    return NextResponse.json({ jobId: jobId || submission.id, status: 'pending' })
  } catch (err: any) {
    console.error('public/analyze error:', err)
    return NextResponse.json({ error: 'Analysis temporarily unavailable' }, { status: 502 })
  }
}
