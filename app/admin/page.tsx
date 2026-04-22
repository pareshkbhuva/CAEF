import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions, isAdmin } from '@/lib/auth'
import { sql } from '@vercel/postgres'
import { percentile } from '@/lib/helpers'
import { PlanChangeForm } from '@/components/PlanChangeForm'

export const dynamic = 'force-dynamic'

async function getAdminData() {
  const [totalUsersRow, dauRow, queriesTodayRow, avgLatRow, errorsRow, totalRow] = await Promise.all([
    sql<{ n: string }>`SELECT COUNT(*) as n FROM users`,
    sql<{ n: string }>`
      SELECT COUNT(DISTINCT user_id) as n FROM usage
      WHERE DATE(created_at) = CURRENT_DATE
    `,
    sql<{ n: string }>`
      SELECT COUNT(*) as n FROM usage
      WHERE DATE(created_at) = CURRENT_DATE AND success = 1
    `,
    sql<{ avg: string | null }>`
      SELECT AVG(latency_ms) as avg FROM usage
      WHERE success = 1 AND latency_ms > 0
        AND created_at >= NOW() - INTERVAL '24 hours'
    `,
    sql<{ n: string }>`
      SELECT COUNT(*) as n FROM usage
      WHERE success = 0 AND created_at >= NOW() - INTERVAL '24 hours'
    `,
    sql<{ n: string }>`
      SELECT COUNT(*) as n FROM usage
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `,
  ])

  const total_users = parseInt(totalUsersRow.rows[0].n, 10)
  const dau_today = parseInt(dauRow.rows[0].n, 10)
  const queries_today = parseInt(queriesTodayRow.rows[0].n, 10)
  const platform_avg_latency = avgLatRow.rows[0].avg ? parseFloat(avgLatRow.rows[0].avg) : 0
  const errors_24h = parseInt(errorsRow.rows[0].n, 10)
  const total_24h = parseInt(totalRow.rows[0].n, 10)
  const error_rate_24h = total_24h ? (errors_24h / total_24h) * 100 : 0

  // Daily chart (last 30 days)
  const dailyRes = await sql<{ date: string; count: string }>`
    SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date, COUNT(*) as count
    FROM usage
    WHERE success = 1 AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC
  `
  const daily_counts = dailyRes.rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) }))

  // Latency percentiles (24h)
  const latRes = await sql<{ latency_ms: number }>`
    SELECT latency_ms FROM usage
    WHERE success = 1 AND latency_ms > 0
      AND created_at >= NOW() - INTERVAL '24 hours'
  `
  const lats = latRes.rows.map((r) => r.latency_ms)
  const platform_p50 = percentile(lats, 50)
  const platform_p95 = percentile(lats, 95)
  const platform_p99 = percentile(lats, 99)

  // Verdict distribution
  const verdictRes = await sql<{ verdict: string; n: string }>`
    SELECT verdict, COUNT(*) as n FROM usage
    WHERE success = 1 AND verdict IS NOT NULL
    GROUP BY verdict
  `
  const pv: Record<string, number> = {}
  for (const row of verdictRes.rows) pv[row.verdict] = parseInt(row.n, 10)
  const platform_verified = pv.verified || 0
  const platform_uncertain = pv.uncertain || 0
  const platform_flagged = pv.flagged || 0
  const platform_total = platform_verified + platform_uncertain + platform_flagged

  // Users with usage stats
  const usersRes = await sql<{
    id: number
    email: string
    plan: string
    api_key: string
    created_at: string
    queries_today: string
    queries_total: string
  }>`
    SELECT
      u.id, u.email, u.plan, u.api_key, u.created_at,
      (SELECT COUNT(*) FROM usage WHERE user_id = u.id AND DATE(created_at) = CURRENT_DATE AND success = 1) as queries_today,
      (SELECT COUNT(*) FROM usage WHERE user_id = u.id AND success = 1) as queries_total
    FROM users u
    ORDER BY (SELECT COUNT(*) FROM usage WHERE user_id = u.id AND success = 1) DESC
  `

  // Recent errors
  const errRes = await sql<{
    endpoint: string
    error_msg: string | null
    created_at: string
    email: string | null
  }>`
    SELECT u.endpoint, u.error_msg, u.created_at, usr.email
    FROM usage u
    LEFT JOIN users usr ON u.user_id = usr.id
    WHERE u.success = 0
    ORDER BY u.created_at DESC
    LIMIT 10
  `

  return {
    total_users,
    dau_today,
    queries_today,
    platform_avg_latency,
    errors_24h,
    total_24h,
    error_rate_24h,
    daily_counts,
    platform_p50,
    platform_p95,
    platform_p99,
    platform_verified,
    platform_uncertain,
    platform_flagged,
    platform_total,
    users: usersRes.rows.map((u) => ({
      ...u,
      queries_today: parseInt(u.queries_today, 10),
      queries_total: parseInt(u.queries_total, 10),
    })),
    recent_errors: errRes.rows,
  }
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/api/auth/signin')
  if (!isAdmin(session.user.email)) redirect('/dashboard')

  const d = await getAdminData()
  const maxCount = Math.max(...d.daily_counts.map((dc) => dc.count), 1)

  return (
    <>
      <style>{`
        .admin { padding: 48px 0 80px; }
        .admin-head { margin-bottom: 40px; }
        .admin-title { font-family: var(--serif); font-size: 36px; font-weight: 500; color: var(--ink); margin-bottom: 8px; }
        .admin-sub { color: var(--ink-3); font-size: 15px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 32px; }
        .kpi { padding: 20px; background: var(--paper); border: 1px solid var(--rule); border-radius: 10px; }
        .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-3); font-weight: 600; margin-bottom: 8px; }
        .kpi-value { font-family: var(--serif); font-size: 28px; font-weight: 500; line-height: 1; color: var(--ink); }
        .kpi-sub { font-size: 12px; color: var(--ink-3); margin-top: 6px; }
        .dual-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
        .panel { background: var(--paper); border: 1px solid var(--rule); border-radius: 10px; overflow: hidden; }
        .panel-head { padding: 18px 22px; border-bottom: 1px solid var(--rule); display: flex; justify-content: space-between; align-items: center; }
        .panel-title { font-family: var(--serif); font-size: 18px; font-weight: 500; }
        .panel-body { padding: 22px; }
        table.admin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        table.admin-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--rule); background: var(--paper-2); }
        table.admin-table td { padding: 12px 16px; border-bottom: 1px solid var(--rule); }
        table.admin-table tr:last-child td { border-bottom: none; }
        .plan-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .badge-free { background: var(--paper-3); color: var(--ink-3); }
        .badge-builder { background: #dbeafe; color: #1e40af; }
        .badge-enterprise { background: var(--ink); color: var(--paper); }
        .chart-grid { display: flex; align-items: flex-end; gap: 4px; height: 140px; padding: 16px 0; margin-bottom: 30px; }
        .chart-bar { flex: 1; background: var(--ink); border-radius: 2px 2px 0 0; position: relative; min-height: 2px; }
        @media (max-width: 900px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .dual-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="admin">
        <div className="container">
          <div className="admin-head">
            <div className="admin-title">Admin</div>
            <div className="admin-sub">Platform metrics · internal use only</div>
          </div>

          <div className="kpi-grid">
            <div className="kpi">
              <div className="kpi-label">Total users</div>
              <div className="kpi-value">{d.total_users}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">DAU today</div>
              <div className="kpi-value">{d.dau_today}</div>
              <div className="kpi-sub">
                {d.total_users ? Math.round((d.dau_today / d.total_users) * 100) : 0}% of users
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Queries today</div>
              <div className="kpi-value">{d.queries_today}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Avg latency</div>
              <div className="kpi-value">
                {d.platform_avg_latency ? Math.round(d.platform_avg_latency) : '—'}
                <span style={{ fontSize: 14, color: 'var(--ink-3)' }}> ms</span>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Error rate (24h)</div>
              <div className="kpi-value">{d.error_rate_24h.toFixed(1)}%</div>
              <div className="kpi-sub">
                {d.errors_24h} of {d.total_24h}
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-head">
              <div className="panel-title">Queries per day · last 30 days</div>
            </div>
            <div className="panel-body">
              {d.daily_counts.length > 0 ? (
                <div className="chart-grid">
                  {d.daily_counts.map((dc, i) => (
                    <div
                      key={i}
                      className="chart-bar"
                      style={{ height: `${(dc.count / maxCount) * 100}%` }}
                      title={`${dc.date}: ${dc.count} queries`}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '40px 0', fontSize: 14 }}>
                  No activity data yet
                </div>
              )}
            </div>
          </div>

          <div className="dual-grid">
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Latency percentiles</div>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Last 24h</span>
              </div>
              <div className="panel-body">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Percentile</th>
                      <th style={{ textAlign: 'right' }}>Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>p50</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {d.platform_p50 ? `${Math.round(d.platform_p50)}ms` : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td>p95</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {d.platform_p95 ? `${Math.round(d.platform_p95)}ms` : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td>p99</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {d.platform_p99 ? `${Math.round(d.platform_p99)}ms` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Platform verdict distribution</div>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>All time</span>
              </div>
              <div className="panel-body">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Verdict</th>
                      <th style={{ textAlign: 'right' }}>Count</th>
                      <th style={{ textAlign: 'right' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Verified</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{d.platform_verified}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {d.platform_total ? ((d.platform_verified / d.platform_total) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                    <tr>
                      <td>Uncertain</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{d.platform_uncertain}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {d.platform_total ? ((d.platform_uncertain / d.platform_total) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                    <tr>
                      <td>Flagged</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{d.platform_flagged}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {d.platform_total ? ((d.platform_flagged / d.platform_total) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-head">
              <div className="panel-title">Users</div>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{d.users.length} total</span>
            </div>
            {d.users.length > 0 ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Plan</th>
                    <th style={{ textAlign: 'right' }}>Today</th>
                    <th style={{ textAlign: 'right' }}>All time</th>
                    <th>Joined</th>
                    <th>Change plan</th>
                  </tr>
                </thead>
                <tbody>
                  {d.users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{u.email}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
                          {u.api_key.slice(0, 16)}...
                        </div>
                      </td>
                      <td>
                        {u.plan === 'free' && <span className="plan-badge badge-free">Free</span>}
                        {u.plan === 'builder' && <span className="plan-badge badge-builder">Builder</span>}
                        {u.plan === 'enterprise' && <span className="plan-badge badge-enterprise">Enterprise</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{u.queries_today}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{u.queries_total}</td>
                      <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                        {new Date(u.created_at).toISOString().slice(0, 10)}
                      </td>
                      <td>
                        <PlanChangeForm userId={u.id} currentPlan={u.plan} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '40px 0' }}>No users yet</div>
            )}
          </div>

          {d.recent_errors.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Recent errors</div>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Last 10</span>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Endpoint</th>
                    <th>User</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recent_errors.map((e, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                        {new Date(e.created_at).toISOString().slice(0, 16).replace('T', ' ')}
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--mono)',
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 3,
                            background: 'var(--paper-3)',
                            color: 'var(--ink-2)',
                          }}
                        >
                          {e.endpoint}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{e.email || '—'}</td>
                      <td style={{ color: 'var(--accent)', fontSize: 12 }}>{e.error_msg || 'Unknown error'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
