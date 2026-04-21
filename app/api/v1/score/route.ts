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
  if (!body.text) {
    return NextResponse.json({ error: "Missing 'text'" }, { status: 400 })
  }
  const text = String(body.text).slice(0, 2000)

  const payload = { action: 'score' as const, text }
  const t0 = Date.now()
  const syncResult = await tryRunPodSync(payload, 7000)
  const lat = Date.now() - t0

  if (syncResult?.output) {
    const category = syncResult.output.category || 'MED'
    const verdict = categoryToVerdict(category)
    await logUsage({
      user_id: user.id,
      endpoint: '/v1/score',
      latency_ms: lat,
      epsilon: syncResult.output.epsilon || 0,
      verdict,
      category,
      text_sample: truncateText(text),
    })
    return NextResponse.json({
      verdict,
      category,
      latency_ms: Math.round(lat),
    })
  }

  if (syncResult?.error) {
    await logUsage({
      user_id: user.id,
      endpoint: '/v1/score',
      latency_ms: lat,
      text_sample: truncateText(text),
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
        endpoint: '/v1/score',
        text_sample: truncateText(text),
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
    endpoint: '/v1/score',
    inputText: text,
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
