import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdmin } from '@/lib/auth'
import { updateUserPlan } from '@/lib/db'
import { PLANS, PlanKey } from '@/lib/helpers'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const plan = body.plan as PlanKey
  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const userId = parseInt(params.id, 10)
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
  }

  await updateUserPlan(userId, plan)
  return NextResponse.json({ success: true })
}
