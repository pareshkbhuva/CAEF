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
  if (!body.text_a || !body.text_b) {
    return NextResponse.json({ error: "Missing 'text_a' or 'text_b'" }, { status: 400 })
  }
  const text_a = String(body.text_a).slice(0, 2000)
  const text_b = String(body.text_b).slice(0, 2000)

  const payload = { action: 'compare' as const, text_a, text_b }
  const t0 = Date.now()
  const syncResult = await tryRunPodSync(payload, 7000)
  const lat = Date.now() - t0

  if (syncResult?.output) {
    const out = syncResult.output
    const aCat = out.text_a?.category || 'MED'
    const bCat = out.text_b?.category || 'MED'

    await logUsage({
      user_id: user.id,
      endpoint: '/v1/compare',
      latency_ms: lat,
      epsilon: out.gap || 0,
      text_sample: truncateText(`${text_a.slice(0, 80)} || ${text_b.slice(0, 80)}`),
    })

    return NextResponse.json({
      text_a: { verdict: categoryToVerdict(aCat), category: aCat },
      text_b: { verdict: categoryToVerdict(bCat), category: bCat },
      more_risky: out.more_risky || (aCat === 'HIGH' ? 'A' : 'B'),
      latency_ms: Math.round(lat),
    })
  }

  if (syncResult?.error) {
    await logUsage({
      user_id: user.id,
      endpoint: '/v1/compare',
      latency_ms: lat,
      text_sample: truncateText(`${text_a.slice(0, 80)} || ${text_b.slice(0, 80)}`),
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
      return NextResponse.json({ error: submission.error }, { status: 502 })
    }
    runpodJobId = submission.id
  }

  const jobId = await createJob({
    userId: user.id,
    runpodJobId,
    endpoint: '/v1/compare',
    inputText: `${text_a} || ${text_b}`,
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
