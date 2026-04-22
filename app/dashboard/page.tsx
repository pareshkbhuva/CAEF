import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserByEmail } from '@/lib/db'
import { sql } from '@vercel/postgres'
import { PLANS, PlanKey, percentile } from '@/lib/helpers'
import { CopyKeyButton } from '@/components/CopyKeyButton'

export const dynamic = 'force-dynamic'

async function getDashboardData(userId: number) {
  const today = new Date().toISOString().slice(0, 10)

  // Usage counts
  const [dailyRow, monthlyRow, totalRow] = await Promise.all([
    sql<{ n: string }>`
      SELECT COUNT(*) as n FROM usage
      WHERE user_id = ${userId}
        AND DATE(created_at) = CURRENT_DATE
        AND success = 1
    `,
    sql<{ n: string }>`
      SELECT COUNT(*) as n FROM usage
      WHERE user_id = ${userId}
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
        AND success = 1
    `,
    sql<{ n: string }>`
      SELECT COUNT(*) as n FROM usage
      WHERE user_id = ${userId} AND success = 1
    `,
  ])

  const daily_used = parseInt(dailyRow.rows[0].n, 10)
  const monthly_used = parseInt(monthlyRow.rows[0].n, 10)
  const total_used = parseInt(totalRow.rows[0].n, 10)

  // Recent 20 queries
  const recentRes = await sql<{
    endpoint: string
    latency_ms: number
    verdict: string | null
    text_sample: string | null
    created_at: string
  }>`
    SELECT endpoint, latency_ms, verdict, text_sample, created_at
    FROM usage
    WHERE user_id = ${userId} AND success = 1
    ORDER BY created_at DESC
    LIMIT 20
  `

  // Verdict distribution
  const verdictRes = await sql<{ verdict: string; n: string }>`
    SELECT verdict, COUNT(*) as n FROM usage
    WHERE user_id = ${userId} AND success = 1 AND verdict IS NOT NULL
    GROUP BY verdict
  `
  const vcounts: Record<string, number> = {}
  for (const row of verdictRes.rows) vcounts[row.verdict] = parseInt(row.n, 10)
  const v_verified = vcounts.verified || 0
  const v_uncertain = vcounts.uncertain || 0
  const v_flagged = vcounts.flagged || 0
  const v_total = v_verified + v_uncertain + v_flagged

  // Latency percentiles (last 30 days)
  const latencyRes = await sql<{ latency_ms: number }>`
    SELECT latency_ms FROM usage
    WHERE user_id = ${userId}
      AND success = 1
      AND latency_ms > 0
      AND created_at >= NOW() - INTERVAL '30 days'
  `
  const latencies = latencyRes.rows.map((r) => r.latency_ms)
  const avg_latency = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0
  const lat_p50 = percentile(latencies, 50)
  const lat_p95 = percentile(latencies, 95)
  const lat_p99 = percentile(latencies, 99)

  return {
    daily_used,
    monthly_used,
    total_used,
    recent: recentRes.rows,
    v_verified,
    v_uncertain,
    v_flagged,
    v_total,
    avg_latency,
    lat_p50,
    lat_p95,
    lat_p99,
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/api/auth/signin')

  const user = await getUserByEmail(session.user.email)
  if (!user) redirect('/api/auth/signin')

  const plan = PLANS[user.plan as PlanKey] || PLANS.free
  const data = await getDashboardData(user.id)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.agnoslogic.com'

  const dailyPct = Math.min((data.daily_used / plan.daily_limit) * 100, 100)
  const monthlyPct = Math.min((data.monthly_used / plan.monthly_limit) * 100, 100)

  return (
    <>
      <style>{`
        .dash { padding: 48px 0 80px; }
        .dash-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; flex-wrap: wrap; gap: 16px; }
        .dash-title { font-family: var(--serif); font-size: 36px; font-weight: 500; color: var(--ink); margin-bottom: 8px; }
        .dash-sub { color: var(--ink-3); font-size: 15px; }
        .dash-plan { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background: var(--paper-2); border: 1px solid var(--rule); border-radius: 20px; font-size: 13px; font-weight: 500; color: var(--ink-2); }
        .dash-plan-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }
        .upgrade-banner { display: flex; justify-content: space-between; align-items: center; background: var(--ink); color: var(--paper); padding: 18px 28px; border-radius: 10px; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
        .ubt { font-family: var(--serif); font-size: 18px; font-weight: 500; margin-bottom: 4px; }
        .ubs { font-size: 13px; color: #d4d4d0; }
        .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
        .metric-card { padding: 24px; background: var(--paper); border: 1px solid var(--rule); border-radius: 10px; }
        .metric-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-3); font-weight: 600; margin-bottom: 10px; }
        .metric-value { font-family: var(--serif); font-size: 32px; font-weight: 500; line-height: 1; color: var(--ink); }
        .metric-context { font-size: 12px; color: var(--ink-3); margin-top: 8px; }
        .metric-progress { height: 4px; background: var(--paper-3); border-radius: 2px; margin-top: 12px; overflow: hidden; }
        .metric-progress-fill { height: 100%; background: var(--ink); border-radius: 2px; transition: width 0.4s; }
        .dash-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 32px; }
        .panel { background: var(--paper); border: 1px solid var(--rule); border-radius: 10px; overflow: hidden; }
        .panel-head { padding: 20px 24px; border-bottom: 1px solid var(--rule); display: flex; justify-content: space-between; align-items: center; }
        .panel-title { font-family: var(--serif); font-size: 18px; font-weight: 500; color: var(--ink); }
        .panel-body { padding: 24px; }
        .key-box { display: flex; gap: 12px; align-items: center; }
        .key-display { flex: 1; font-family: var(--mono); font-size: 13px; background: var(--paper-2); padding: 12px 16px; border-radius: 6px; border: 1px solid var(--rule); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; user-select: all; }
        .code-snippet { background: var(--ink); color: #e8e8e8; border-radius: 6px; padding: 18px 22px; font-family: var(--mono); font-size: 12.5px; line-height: 1.7; overflow-x: auto; white-space: pre; }
        .code-snippet .comment { color: #71717a; }
        .code-snippet .str { color: #a7f3d0; }
        .code-snippet .key { color: #c4b5fd; }
        .verdict-dist { display: flex; flex-direction: column; gap: 14px; }
        .verdict-row { display: flex; align-items: center; gap: 12px; }
        .verdict-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .vdot-verified { background: var(--green); }
        .vdot-uncertain { background: var(--amber); }
        .vdot-flagged { background: var(--accent); }
        .verdict-name { font-size: 13px; color: var(--ink-2); width: 80px; flex-shrink: 0; }
        .verdict-bar { flex: 1; height: 8px; background: var(--paper-3); border-radius: 4px; overflow: hidden; }
        .verdict-fill { height: 100%; border-radius: 4px; transition: width 0.4s; }
        .vfill-verified { background: var(--green); }
        .vfill-uncertain { background: var(--amber); }
        .vfill-flagged { background: var(--accent); }
        .verdict-pct { font-family: var(--mono); font-size: 12px; color: var(--ink-3); width: 50px; text-align: right; flex-shrink: 0; }
        .lat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .lat-card { padding: 14px; background: var(--paper-2); border-radius: 6px; text-align: center; }
        .lat-label { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 4px; }
        .lat-value { font-family: var(--mono); font-size: 20px; font-weight: 500; color: var(--ink); }
        table.history { width: 100%; border-collapse: collapse; font-size: 13px; }
        table.history th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--rule); background: var(--paper-2); }
        table.history td { padding: 12px 16px; border-bottom: 1px solid var(--rule); vertical-align: middle; }
        table.history tr:last-child td { border-bottom: none; }
        .endpoint-tag-sm { font-family: var(--mono); font-size: 11px; padding: 2px 6px; border-radius: 3px; background: var(--paper-3); color: var(--ink-2); }
        .verdict-pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .pill-verified { background: var(--green-soft); color: var(--green); }
        .pill-uncertain { background: var(--amber-soft); color: var(--amber); }
        .pill-flagged { background: var(--accent-soft); color: var(--accent); }
        .pill-none { background: var(--paper-3); color: var(--ink-3); }
        .text-sample { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink-2); }
        .empty-state { text-align: center; padding: 48px 24px; color: var(--ink-3); }
        .empty-state h3 { font-family: var(--serif); color: var(--ink-2); font-weight: 500; margin-bottom: 8px; }
        @media (max-width: 768px) {
          .metric-grid { grid-template-columns: repeat(2, 1fr); }
          .dash-grid { grid-template-columns: 1fr; }
          .text-sample { max-width: 160px; }
        }
      `}</style>

      <div className="dash">
        <div className="container">
          <div className="dash-head">
            <div>
              <div className="dash-title">Dashboard</div>
              <div className="dash-sub">Welcome back, {user.name || user.email}.</div>
            </div>
            <div className="dash-plan">
              <span className="dash-plan-dot"></span>
              {plan.name} plan
            </div>
          </div>

          {user.plan === 'free' && (
            <div className="upgrade-banner">
              <div>
                <div className="ubt">Need more queries?</div>
                <div className="ubs">Upgrade to Builder for 500/day, 10,000/month, priority queue and analytics.</div>
              </div>
              <a
                href="mailto:hello@agnoslogic.com?subject=Builder%20upgrade"
                className="btn btn-inverse"
              >
                Upgrade to Builder
              </a>
            </div>
          )}

          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-label">Today</div>
              <div className="metric-value">{data.daily_used}</div>
              <div className="metric-context">of {plan.daily_limit} daily</div>
              <div className="metric-progress">
                <div className="metric-progress-fill" style={{ width: `${dailyPct}%` }}></div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">This month</div>
              <div className="metric-value">{data.monthly_used}</div>
              <div className="metric-context">of {plan.monthly_limit} monthly</div>
              <div className="metric-progress">
                <div className="metric-progress-fill" style={{ width: `${monthlyPct}%` }}></div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">All time</div>
              <div className="metric-value">{data.total_used}</div>
              <div className="metric-context">total queries</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Avg latency</div>
              <div className="metric-value">
                {data.avg_latency ? Math.round(data.avg_latency) : '—'}
                <span style={{ fontSize: 18, color: 'var(--ink-3)', fontWeight: 400 }}> ms</span>
              </div>
              <div className="metric-context">last 30 days</div>
            </div>
          </div>

          <div className="dash-grid">
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Your API key</div>
                <Link href="/docs" style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>
                  Documentation →
                </Link>
              </div>
              <div className="panel-body">
                <div className="key-box">
                  <div className="key-display">{user.api_key}</div>
                  <CopyKeyButton apiKey={user.api_key} />
                </div>
                <div style={{ marginTop: 16, fontSize: 13, color: 'var(--ink-3)' }}>
                  Keep this secret. Use it in the{' '}
                  <code style={{ background: 'var(--paper-2)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 12 }}>
                    Authorization: Bearer
                  </code>{' '}
                  header.
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Verdict distribution</div>
              </div>
              <div className="panel-body">
                {data.v_total > 0 ? (
                  <div className="verdict-dist">
                    <div className="verdict-row">
                      <div className="verdict-dot vdot-verified"></div>
                      <div className="verdict-name">Verified</div>
                      <div className="verdict-bar">
                        <div
                          className="verdict-fill vfill-verified"
                          style={{ width: `${(data.v_verified / data.v_total) * 100}%` }}
                        ></div>
                      </div>
                      <div className="verdict-pct">{data.v_verified}</div>
                    </div>
                    <div className="verdict-row">
                      <div className="verdict-dot vdot-uncertain"></div>
                      <div className="verdict-name">Uncertain</div>
                      <div className="verdict-bar">
                        <div
                          className="verdict-fill vfill-uncertain"
                          style={{ width: `${(data.v_uncertain / data.v_total) * 100}%` }}
                        ></div>
                      </div>
                      <div className="verdict-pct">{data.v_uncertain}</div>
                    </div>
                    <div className="verdict-row">
                      <div className="verdict-dot vdot-flagged"></div>
                      <div className="verdict-name">Flagged</div>
                      <div className="verdict-bar">
                        <div
                          className="verdict-fill vfill-flagged"
                          style={{ width: `${(data.v_flagged / data.v_total) * 100}%` }}
                        ></div>
                      </div>
                      <div className="verdict-pct">{data.v_flagged}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: '20px 0' }}>
                    No queries yet
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="dash-grid">
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Quick start</div>
                <Link href="/docs" style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>
                  Full docs →
                </Link>
              </div>
              <div className="panel-body">
                <pre className="code-snippet">
                  <span className="comment"># Python · first request</span>{'\n'}
                  <span className="key">import</span> requests{'\n\n'}
                  response = requests.post({'\n'}
                  {'    '}<span className="str">&quot;{baseUrl}/v1/ask&quot;</span>,{'\n'}
                  {'    '}headers={'{'}<span className="str">&quot;Authorization&quot;</span>: <span className="str">&quot;Bearer {user.api_key.slice(0, 28)}...&quot;</span>{'}'},{'\n'}
                  {'    '}json={'{'}<span className="str">&quot;question&quot;</span>: <span className="str">&quot;How does antibiotic resistance develop?&quot;</span>{'}'}{'\n'}
                  ){'\n'}
                  <span className="key">print</span>(response.json())
                </pre>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Latency percentiles</div>
              </div>
              <div className="panel-body">
                {data.v_total > 0 ? (
                  <div className="lat-grid">
                    <div className="lat-card">
                      <div className="lat-label">p50</div>
                      <div className="lat-value">{Math.round(data.lat_p50) || '—'}ms</div>
                    </div>
                    <div className="lat-card">
                      <div className="lat-label">p95</div>
                      <div className="lat-value">{Math.round(data.lat_p95) || '—'}ms</div>
                    </div>
                    <div className="lat-card">
                      <div className="lat-label">p99</div>
                      <div className="lat-value">{Math.round(data.lat_p99) || '—'}ms</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: '20px 0' }}>
                    No queries yet
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Recent queries</div>
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Last 20</span>
            </div>
            {data.recent.length > 0 ? (
              <table className="history">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Endpoint</th>
                    <th>Text sample</th>
                    <th>Verdict</th>
                    <th style={{ textAlign: 'right' }}>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                        {new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' ')}
                      </td>
                      <td>
                        <span className="endpoint-tag-sm">{r.endpoint}</span>
                      </td>
                      <td className="text-sample">{r.text_sample || '—'}</td>
                      <td>
                        {r.verdict === 'verified' && <span className="verdict-pill pill-verified">Verified</span>}
                        {r.verdict === 'uncertain' && <span className="verdict-pill pill-uncertain">Uncertain</span>}
                        {r.verdict === 'flagged' && <span className="verdict-pill pill-flagged">Flagged</span>}
                        {!r.verdict && <span className="verdict-pill pill-none">—</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                        {r.latency_ms ? `${Math.round(r.latency_ms)}ms` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <h3>No queries yet</h3>
                <p>Make your first API call to see it here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
