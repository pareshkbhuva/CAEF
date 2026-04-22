import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-auth'
import { countTodayUsage, countMonthUsage } from '@/lib/db'
import { PLANS, PlanKey } from '@/lib/helpers'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return auth.response
  const { user } = auth

  const [daily, monthly] = await Promise.all([
    countTodayUsage(user.id),
    countMonthUsage(user.id),
  ])
  const plan = PLANS[user.plan as PlanKey] || PLANS.free

  return NextResponse.json({
    plan: user.plan,
    daily: { used: daily, limit: plan.daily_limit },
    monthly: { used: monthly, limit: plan.monthly_limit },
  })
}
