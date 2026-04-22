import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-auth'
import { tryRunPodSync, submitRunPodJob } from '@/lib/runpod'
import { logUsage, createJob } from '@/lib/db'
import { categoryToVerdict, truncateText } from '@/lib/helpers'

export const maxDuration = 10

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return auth.response
  const { user } = auth

  const body = await req.json().catch(() => ({}))
  if (!body.question) {
    return NextResponse.json({ error: "Missing 'question'" }, { status: 400 })
  }
  const question = String(body.question).slice(0, 2000)
  const maxTokens = Math.min(parseInt(body.max_tokens, 10) || 200, 512)

  const payload = {
    action: 'generate_and_score' as const,
    question,
    max_tokens: maxTokens,
  }

  const t0 = Date.now()
  const syncResult = await tryRunPodSync(payload, 7000)
  const lat = Date.now() - t0

  if (syncResult?.output) {
    const out = syncResult.output
    const category = out.category || 'MED'
    const verdict = categoryToVerdict(category)
    const response = out.response || out.generated || ''

    await logUsage({
      user_id: user.id,
      endpoint: '/v1/ask',
      latency_ms: lat,
      epsilon: out.epsilon || 0,
      verdict,
      category,
      text_sample: truncateText(question),
    })

    return NextResponse.json({
      response,
      verdict,
      category,
      latency_ms: Math.round(lat),
    })
  }

  if (syncResult?.error) {
    await logUsage({
      user_id: user.id,
      endpoint: '/v1/ask',
      latency_ms: lat,
      text_sample: truncateText(question),
      success: 0,
      error_msg: syncResult.error,
    })
    return NextResponse.json({ error: syncResult.error }, { status: 502 })
  }

  // Async fallback - reuse runsync's job ID if we have one
  let runpodJobId: string
  if (syncResult?.pendingId) {
    runpodJobId = syncResult.pendingId
  } else {
    const submission = await submitRunPodJob(payload)
    if ('error' in submission) {
      await logUsage({
        user_id: user.id,
        endpoint: '/v1/ask',
        text_sample: truncateText(question),
        success: 0,
        error_msg: submission.error,
      })
      return NextResponse.json({ error: submission.error }, { status: 502 })
    }
    runpodJobId = submission.id
  }

  const jobId = await createJob({
    userId: user.id,
    runpodJobId,
    endpoint: '/v1/ask',
    inputText: question,
  })

  return NextResponse.json(
    {
      status: 'pending',
      jobId,
      message: `Inference backend is warming up. Poll GET /api/jobs/${jobId} every 2 seconds.`,
    },
    { status: 202 }
  )
}
