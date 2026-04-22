export type Verdict = 'verified' | 'uncertain' | 'flagged'
export type Category = 'LOW' | 'MED' | 'HIGH'

export function categoryToVerdict(category: Category | string | undefined): Verdict {
  if (category === 'LOW') return 'verified'
  if (category === 'HIGH') return 'flagged'
  return 'uncertain'
}

export function truncateText(s: string | null | undefined, n: number = 200): string {
  if (!s) return ''
  const cleaned = String(s).trim().replace(/\n/g, ' ')
  return cleaned.length > n ? cleaned.slice(0, n) + '…' : cleaned
}

export const PLANS = {
  free: { daily_limit: 15, monthly_limit: 450, name: 'Explorer' },
  builder: { daily_limit: 500, monthly_limit: 10000, name: 'Builder' },
  enterprise: { daily_limit: 99999, monthly_limit: 999999, name: 'Enterprise' },
} as const

export type PlanKey = keyof typeof PLANS

export const PUBLIC_DEMO_DAILY_LIMIT = 10

export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || ''
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

export function percentile(data: number[], p: number): number {
  if (data.length === 0) return 0
  const sorted = [...data].sort((a, b) => a - b)
  const k = (sorted.length - 1) * (p / 100)
  const f = Math.floor(k)
  const c = Math.ceil(k)
  if (f === c) return sorted[f]
  if (c >= sorted.length) return sorted[f]
  return sorted[f] + (sorted[c] - sorted[f]) * (k - f)
}
