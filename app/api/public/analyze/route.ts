import { NextRequest, NextResponse } from 'next/server'
import {
  hashIp,
  checkPublicDemoLimit,
  recordPublicDemoCall,
  createJob,
} from '@/lib/db'
import { tryRunPodSync, submitRunPodJob } from '@/lib/runpod'
import {
  getClientIp,
  categoryToVerdict,
  PUBLIC_DEMO_DAILY_LIMIT,
} from '@/lib/helpers'

export const maxDuration = 10

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

    // IP rate limit
    const ipHash = hashIp(getClientIp(req))
    const allowed = await checkPublicDemoLimit(ipHash, PUBLIC_DEMO_DAILY_LIMIT)
    if (!allowed) {
      return NextResponse.json(
        {
          error: `Daily demo limit reached (${PUBLIC_DEMO_DAILY_LIMIT}/day). Sign up free for 15 queries per day.`,
        },
        { status: 429 }
      )
    }
    await recordPublicDemoCall(ipHash)

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
      const response = mode === 'ask' ? out.response || out.generated || '' : undefined
      return NextResponse.json({
        category,
        verdict: categoryToVerdict(category),
        response,
      })
    }

    if (syncResult?.error) {
      return NextResponse.json({ error: syncResult.error }, { status: 502 })
    }

    // Cold start path: runsync returned a job ID we can reuse, or we timed out
    let runpodJobId: string
    if (syncResult?.pendingId) {
      runpodJobId = syncResult.pendingId
    } else {
      const submission = await submitRunPodJob(payload)
      if ('error' in submission) {
        return NextResponse.json({ error: submission.error }, { status: 502 })
      }
      runpodJobId = submission.id
    }

    const jobId = await createJob({
      userId: null, // public demo, no user
      runpodJobId,
      endpoint: `/public/${mode}`,
      inputText: text,
    })

    return NextResponse.json({ jobId, status: 'pending' })
  } catch (err: any) {
    console.error('public/analyze error:', err)
    return NextResponse.json({ error: 'Analysis temporarily unavailable' }, { status: 502 })
  }
}
