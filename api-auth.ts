import { NextRequest, NextResponse } from 'next/server'
import { getUserByApiKey, countTodayUsage, User } from './db'
import { PLANS, PlanKey } from './helpers'

export type ApiAuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse }

export async function authenticateApiKey(req: NextRequest): Promise<ApiAuthResult> {
  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Missing API key. Use header: Authorization: Bearer YOUR_KEY' },
        { status: 401 }
      ),
    }
  }

  const key = auth.slice(7).trim()
  const user = await getUserByApiKey(key)
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }),
    }
  }

  const plan = PLANS[user.plan as PlanKey] || PLANS.free
  const used = await countTodayUsage(user.id)
  if (used >= plan.daily_limit) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Daily limit exceeded',
          used,
          limit: plan.daily_limit,
          plan: user.plan,
        },
        { status: 429 }
      ),
    }
  }

  return { ok: true, user }
}
