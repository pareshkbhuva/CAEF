import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: 'agnoslogic-v51h',
    runpod: Boolean(process.env.RUNPOD_API_KEY),
  })
}
