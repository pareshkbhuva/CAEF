import { NextRequest, NextResponse } from 'next/server'
import { checkRunPodJob } from '@/lib/runpod'
import { categoryToVerdict, truncateText } from '@/lib/helpers'

export const maxDuration = 10

// Try to get job from database, fallback to treating ID as RunPod job ID
async function getJobData(id: string) {
  try {
    const { getJob } = await import('@/lib/db')
    return await getJob(id)
  } catch (err) {
    // Database not available - treat ID as RunPod job ID directly
    console.log('[v0] Database unavailable, treating ID as RunPod job ID')
    return null
  }
}

// Try to update job result in database
async function saveJobResult(
  id: string, 
  result: any, 
  status: 'completed' | 'failed',
  errorMsg: string | null = null
) {
  try {
    const { updateJobResult } = await import('@/lib/db')
    await updateJobResult(id, result, status, errorMsg)
  } catch (err) {
    // Database not available, skip saving
    console.log('[v0] Database unavailable, skipping job result save')
  }
}

// Try to log usage
async function saveUsageLog(log: any) {
  try {
    const { logUsage } = await import('@/lib/db')
    await logUsage(log)
  } catch (err) {
    // Database not available, skip logging
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const jobId = params.id
    const job = await getJobData(jobId)

    // If we have a database job record
    if (job) {
      // Already completed or failed — return stored result
      if (job.status === 'completed') {
        return NextResponse.json({
          status: 'completed',
          result: job.result,
        })
      }
      if (job.status === 'failed') {
        return NextResponse.json({
          status: 'failed',
          error: job.error_msg || 'Analysis failed',
        })
      }

      // Check RunPod for current status
      const runpodId = job.runpod_job_id
      if (!runpodId) {
        return NextResponse.json({
          status: 'failed',
          error: 'Job missing RunPod ID',
        })
      }

      const check = await checkRunPodJob(runpodId)
      return handleRunPodResult(check, jobId, job.user_id, job.endpoint, job.input_text)
    }

    // No database job record - treat ID as RunPod job ID directly
    const check = await checkRunPodJob(jobId)
    return handleRunPodResult(check, jobId, null, 'public/demo', '')
  } catch (err: any) {
    console.error('jobs/[id] error:', err)
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
  }
}

async function handleRunPodResult(
  check: { status: string; output?: any; error?: string },
  jobId: string,
  userId: number | null,
  endpoint: string,
  inputText: string
) {
  if (check.status === 'COMPLETED' && check.output) {
    const out = check.output
    const category = out.category || 'MED'
    const verdict = categoryToVerdict(category)
    const response = out.response || out.generated || null

    const resultData = {
      category,
      verdict,
      response,
    }

    await saveJobResult(jobId, resultData, 'completed')

    // Log usage if associated with a user
    if (userId) {
      await saveUsageLog({
        user_id: userId,
        endpoint: endpoint,
        verdict,
        category,
        text_sample: truncateText(inputText),
        success: 1,
      })
    }

    return NextResponse.json({
      status: 'completed',
      result: resultData,
    })
  }

  if (check.status === 'FAILED' || check.status === 'TIMED_OUT' || check.status === 'CANCELLED') {
    const errMsg = check.error || `Job ${check.status.toLowerCase()}`
    await saveJobResult(jobId, null, 'failed', errMsg)

    if (userId) {
      await saveUsageLog({
        user_id: userId,
        endpoint: endpoint,
        text_sample: truncateText(inputText),
        success: 0,
        error_msg: errMsg,
      })
    }

    return NextResponse.json({
      status: 'failed',
      error: errMsg,
    })
  }

  // Still running
  return NextResponse.json({
    status: 'running',
    runpod_status: check.status,
  })
}
