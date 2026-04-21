import { NextRequest, NextResponse } from 'next/server'
import { getJob, updateJobResult, logUsage } from '@/lib/db'
import { checkRunPodJob } from '@/lib/runpod'
import { categoryToVerdict, truncateText } from '@/lib/helpers'

export const maxDuration = 10

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const job = await getJob(params.id)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

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
    if (!job.runpod_job_id) {
      return NextResponse.json({
        status: 'failed',
        error: 'Job missing RunPod ID',
      })
    }

    const check = await checkRunPodJob(job.runpod_job_id)

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

      await updateJobResult(params.id, resultData, 'completed')

      // Log usage if associated with a user
      if (job.user_id) {
        await logUsage({
          user_id: job.user_id,
          endpoint: job.endpoint,
          verdict,
          category,
          text_sample: truncateText(job.input_text),
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
      await updateJobResult(params.id, null, 'failed', errMsg)

      if (job.user_id) {
        await logUsage({
          user_id: job.user_id,
          endpoint: job.endpoint,
          text_sample: truncateText(job.input_text),
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
  } catch (err: any) {
    console.error('jobs/[id] error:', err)
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
  }
}
