const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || ''
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || ''
const RUNPOD_BASE = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`

export interface RunPodPayload {
  action: 'score' | 'generate_and_score' | 'compare'
  text?: string
  question?: string
  text_a?: string
  text_b?: string
  max_tokens?: number
}

export interface RunPodResult {
  category?: 'LOW' | 'MED' | 'HIGH'
  epsilon?: number
  response?: string
  generated?: string
  text_a?: { category?: string; epsilon?: number }
  text_b?: { category?: string; epsilon?: number }
  more_risky?: string
  gap?: number
}

/**
 * Submit job to RunPod's async /run endpoint.
 * Returns immediately with a RunPod job ID; the actual inference happens in background.
 * This is critical for Vercel Hobby (10s timeout) — sync calls would fail on cold starts.
 */
export async function submitRunPodJob(payload: RunPodPayload): Promise<{ id: string } | { error: string }> {
  if (!RUNPOD_API_KEY) {
    return { error: 'RunPod not configured' }
  }
  try {
    const res = await fetch(`${RUNPOD_BASE}/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: payload }),
      signal: AbortSignal.timeout(8000), // stay under 10s Vercel limit
      cache: 'no-store',
    })
    if (!res.ok) {
      return { error: `RunPod HTTP ${res.status}` }
    }
    const data = await res.json()
    if (!data.id) {
      return { error: 'No job ID returned from RunPod' }
    }
    return { id: data.id }
  } catch (err: any) {
    return { error: err?.message || 'RunPod request failed' }
  }
}

/**
 * Check the status of a submitted RunPod job.
 * Returns: IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED, TIMED_OUT, CANCELLED
 */
export async function checkRunPodJob(
  runpodJobId: string
): Promise<{ status: string; output?: RunPodResult; error?: string }> {
  if (!RUNPOD_API_KEY) {
    return { status: 'FAILED', error: 'RunPod not configured' }
  }
  try {
    const res = await fetch(`${RUNPOD_BASE}/status/${runpodJobId}`, {
      headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store', // Disable caching - we need fresh status every time
      next: { revalidate: 0 }, // Also disable Next.js caching
    })
    if (!res.ok) {
      return { status: 'FAILED', error: `HTTP ${res.status}` }
    }
    const data = await res.json()
    return {
      status: data.status || 'UNKNOWN',
      output: data.output,
      error: data.error,
    }
  } catch (err: any) {
    return { status: 'FAILED', error: err?.message || 'Status check failed' }
  }
}

/**
 * Try a short /runsync call (for fast warm inferences that complete in <8s).
 * Returns one of three shapes:
 *   { output }       → completed synchronously, use the result
 *   { error }        → failed
 *   { pendingId }    → job is still queued/running; poll with this RunPod ID
 */
export async function tryRunPodSync(
  payload: RunPodPayload,
  timeoutMs: number = 7000
): Promise<{ output?: RunPodResult; error?: string; pendingId?: string } | null> {
  if (!RUNPOD_API_KEY) {
    return { error: 'RunPod not configured' }
  }
  try {
    const res = await fetch(`${RUNPOD_BASE}/runsync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: payload }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    })
    if (!res.ok) {
      return { error: `HTTP ${res.status}` }
    }
    const data = await res.json()
    if (data.status === 'COMPLETED') {
      return { output: data.output }
    }
    if (data.status === 'FAILED') {
      return { error: 'Inference failed' }
    }
    // IN_QUEUE or IN_PROGRESS — return the RunPod job ID so the caller
    // can track the same job rather than submitting a new one.
    if (data.id) {
      return { pendingId: data.id }
    }
    return null
  } catch (err: any) {
    // Timeout or network error — caller should submit fresh async job
    return null
  }
}
