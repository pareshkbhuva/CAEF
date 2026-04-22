import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Documentation',
  description: 'AgnosLogic REST API reference. Three endpoints for scoring, generating with verification, and comparing claims.',
}

export default function DocsPage() {
  return (
    <>
      <style>{`
        .docs-layout { display: grid; grid-template-columns: 220px 1fr; gap: 64px; max-width: 1180px; margin: 0 auto; padding: 48px 32px 80px; }
        .docs-side { position: sticky; top: 96px; align-self: start; }
        .docs-side h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-3); font-weight: 600; margin-bottom: 12px; margin-top: 24px; }
        .docs-side h4:first-child { margin-top: 0; }
        .docs-side ul { list-style: none; }
        .docs-side li { margin-bottom: 6px; }
        .docs-side a { font-size: 14px; color: var(--ink-2); text-decoration: none; display: block; padding: 4px 0; }
        .docs-side a:hover { color: var(--ink); }
        .docs-main h1 { font-size: 42px; margin-bottom: 16px; font-weight: 500; }
        .docs-main h2 { font-size: 28px; margin-top: 64px; margin-bottom: 16px; scroll-margin-top: 80px; padding-top: 12px; border-top: 1px solid var(--rule); }
        .docs-main h2:first-of-type { border-top: none; margin-top: 40px; padding-top: 0; }
        .docs-main h3 { margin-top: 32px; margin-bottom: 10px; }
        .docs-main p { margin-bottom: 16px; }
        .endpoint-tag { display: inline-block; padding: 3px 8px; border-radius: 4px; font-family: var(--mono); font-size: 12px; font-weight: 600; margin-right: 10px; }
        .tag-post { background: #dbeafe; color: #1e40af; }
        .tag-get { background: #dcfce7; color: #166534; }
        .endpoint-path { font-family: var(--mono); font-size: 17px; font-weight: 500; }
        .code-block { background: var(--ink); color: #e8e8e8; padding: 20px 24px; border-radius: 6px; font-family: var(--mono); font-size: 13px; line-height: 1.7; overflow-x: auto; white-space: pre; margin: 16px 0; }
        .code-block .comment { color: #71717a; }
        .code-block .str { color: #a7f3d0; }
        .code-block .key { color: #c4b5fd; }
        .code-block .fn { color: #fbbf24; }
        .code-block .num { color: #fde68a; }
        .params-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
        .params-table th { text-align: left; padding: 10px 12px; font-size: 12px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--rule); background: var(--paper-2); }
        .params-table td { padding: 12px; border-bottom: 1px solid var(--rule); vertical-align: top; }
        .param-name { font-family: var(--mono); font-size: 13px; font-weight: 500; }
        .param-type { font-family: var(--mono); font-size: 12px; color: var(--ink-3); }
        .required { color: var(--accent); font-family: var(--mono); font-size: 11px; margin-left: 6px; }
        code.inline { background: var(--paper-3); padding: 2px 6px; border-radius: 3px; font-family: var(--mono); font-size: 13px; color: var(--ink); }
        .callout { background: var(--amber-soft); border-left: 3px solid var(--amber); padding: 16px 20px; margin: 20px 0; font-size: 14px; }
        @media (max-width: 900px) {
          .docs-layout { grid-template-columns: 1fr; gap: 32px; }
          .docs-side { position: static; }
        }
      `}</style>

      <div className="docs-layout">
        <aside className="docs-side">
          <h4>Getting started</h4>
          <ul>
            <li><a href="#auth">Authentication</a></li>
            <li><a href="#async">Async pattern</a></li>
            <li><a href="#rate-limits">Rate limits</a></li>
            <li><a href="#errors">Errors</a></li>
          </ul>
          <h4>Endpoints</h4>
          <ul>
            <li><a href="#score">POST /v1/score</a></li>
            <li><a href="#ask">POST /v1/ask</a></li>
            <li><a href="#compare">POST /v1/compare</a></li>
            <li><a href="#usage">GET /v1/usage</a></li>
            <li><a href="#health">GET /v1/health</a></li>
            <li><a href="#jobs">GET /api/jobs/:id</a></li>
          </ul>
        </aside>

        <div className="docs-main">
          <div className="eyebrow">API Reference</div>
          <h1>Documentation</h1>
          <p className="lead">
            The AgnosLogic API is a JSON REST API over HTTPS. Authenticate with Bearer tokens. All responses include latency metrics and calibrated verdicts.
          </p>
          <div className="code-block">
            <span className="comment"># Base URL</span>{'\n'}
            https://www.agnoslogic.com/v1
          </div>

          <h2 id="auth">Authentication</h2>
          <p>
            Every request requires a Bearer token in the <code className="inline">Authorization</code> header. Get your API key from the <a href="/dashboard">dashboard</a> after signing in with Google.
          </p>
          <div className="code-block">
            <span className="key">Authorization</span>: Bearer agnoslogic_<span className="str">YOUR_API_KEY</span>
          </div>

          <h2 id="async">Async pattern (for cold starts)</h2>
          <p>
            API endpoints try to return synchronously within 7 seconds. If the inference backend is cold (first request in a while), the endpoint returns{' '}
            <code className="inline">202 Accepted</code> with a <code className="inline">jobId</code>. Poll{' '}
            <code className="inline">GET /api/jobs/:id</code> every 2 seconds until you get <code className="inline">status: &quot;completed&quot;</code>.
          </p>
          <div className="callout">
            <strong>Note:</strong> Cold starts typically add 30–90 seconds on the first request after inactivity. Subsequent requests are sub-100ms.
          </div>
          <div className="code-block">
            <span className="comment"># Example: handle both sync and async responses</span>{'\n'}
            response = requests.post(<span className="str">&quot;/v1/ask&quot;</span>, ...){'\n'}
            data = response.json(){'\n\n'}
            <span className="key">if</span> <span className="str">&quot;jobId&quot;</span> <span className="key">in</span> data:{'\n'}
            {'    '}<span className="comment"># Poll until complete</span>{'\n'}
            {'    '}<span className="key">while True</span>:{'\n'}
            {'        '}time.sleep(<span className="num">2</span>){'\n'}
            {'        '}status = requests.get(<span className="str">f&quot;/api/jobs/{'{'}{`{data["jobId"]}`}{'}'}&quot;</span>).json(){'\n'}
            {'        '}<span className="key">if</span> status[<span className="str">&quot;status&quot;</span>] == <span className="str">&quot;completed&quot;</span>:{'\n'}
            {'            '}data = status[<span className="str">&quot;result&quot;</span>]{'\n'}
            {'            '}<span className="key">break</span>
          </div>

          <h2 id="rate-limits">Rate limits</h2>
          <p>Rate limits are enforced per API key based on your plan. Usage resets at midnight UTC.</p>
          <table className="params-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Daily</th>
                <th>Monthly</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Explorer (free)</td>
                <td>15</td>
                <td>450</td>
              </tr>
              <tr>
                <td>Builder</td>
                <td>500</td>
                <td>10,000</td>
              </tr>
              <tr>
                <td>Enterprise</td>
                <td>Unlimited</td>
                <td>Unlimited</td>
              </tr>
            </tbody>
          </table>

          <h2 id="errors">Errors</h2>
          <table className="params-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code className="inline">400</code></td><td>Missing or invalid request parameters</td></tr>
              <tr><td><code className="inline">401</code></td><td>Missing or invalid API key</td></tr>
              <tr><td><code className="inline">202</code></td><td>Job queued — poll for result</td></tr>
              <tr><td><code className="inline">429</code></td><td>Rate limit exceeded</td></tr>
              <tr><td><code className="inline">502</code></td><td>Inference backend unavailable</td></tr>
            </tbody>
          </table>

          <h2 id="score"><span className="endpoint-tag tag-post">POST</span><span className="endpoint-path">/v1/score</span></h2>
          <p>Score a piece of text for epistemic risk. Returns a verdict without generating new content.</p>
          <table className="params-table">
            <thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr>
                <td><span className="param-name">text</span><span className="required">required</span></td>
                <td><span className="param-type">string</span></td>
                <td>Text to analyze. Max 2000 characters.</td>
              </tr>
            </tbody>
          </table>
          <div className="code-block">
            <span className="fn">curl</span> https://www.agnoslogic.com/v1/score \{'\n'}
            {'  '}-H <span className="str">&quot;Authorization: Bearer YOUR_API_KEY&quot;</span> \{'\n'}
            {'  '}-H <span className="str">&quot;Content-Type: application/json&quot;</span> \{'\n'}
            {'  '}-d <span className="str">{`'{"text": "Water boils at 100°C at sea level."}'`}</span>
          </div>
          <div className="code-block">
            <span className="comment"># Response</span>{'\n'}
            {'{'}{'\n'}
            {'  '}<span className="key">&quot;verdict&quot;</span>: <span className="str">&quot;verified&quot;</span>,{'\n'}
            {'  '}<span className="key">&quot;category&quot;</span>: <span className="str">&quot;LOW&quot;</span>,{'\n'}
            {'  '}<span className="key">&quot;latency_ms&quot;</span>: <span className="num">87</span>{'\n'}
            {'}'}
          </div>

          <h2 id="ask"><span className="endpoint-tag tag-post">POST</span><span className="endpoint-path">/v1/ask</span></h2>
          <p>Generate an answer to a question with a built-in verdict.</p>
          <table className="params-table">
            <thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr>
                <td><span className="param-name">question</span><span className="required">required</span></td>
                <td><span className="param-type">string</span></td>
                <td>The question to answer.</td>
              </tr>
              <tr>
                <td><span className="param-name">max_tokens</span></td>
                <td><span className="param-type">integer</span></td>
                <td>Max response length. Default: 200. Max: 512.</td>
              </tr>
            </tbody>
          </table>

          <h2 id="compare"><span className="endpoint-tag tag-post">POST</span><span className="endpoint-path">/v1/compare</span></h2>
          <p>Compare two statements and identify which is more likely to be hallucinated.</p>

          <h2 id="usage"><span className="endpoint-tag tag-get">GET</span><span className="endpoint-path">/v1/usage</span></h2>
          <p>Check current rate limit usage for your API key.</p>

          <h2 id="health"><span className="endpoint-tag tag-get">GET</span><span className="endpoint-path">/v1/health</span></h2>
          <p>Public endpoint. No authentication required. Returns API status.</p>

          <h2 id="jobs"><span className="endpoint-tag tag-get">GET</span><span className="endpoint-path">/api/jobs/:id</span></h2>
          <p>Check the status of an async job. Poll every 2 seconds.</p>
          <div className="code-block">
            <span className="comment"># Response while running</span>{'\n'}
            {'{'} <span className="key">&quot;status&quot;</span>: <span className="str">&quot;running&quot;</span>, <span className="key">&quot;runpod_status&quot;</span>: <span className="str">&quot;IN_PROGRESS&quot;</span> {'}'}{'\n\n'}
            <span className="comment"># Response when complete</span>{'\n'}
            {'{'}{'\n'}
            {'  '}<span className="key">&quot;status&quot;</span>: <span className="str">&quot;completed&quot;</span>,{'\n'}
            {'  '}<span className="key">&quot;result&quot;</span>: {'{'}{'\n'}
            {'    '}<span className="key">&quot;verdict&quot;</span>: <span className="str">&quot;verified&quot;</span>,{'\n'}
            {'    '}<span className="key">&quot;category&quot;</span>: <span className="str">&quot;LOW&quot;</span>,{'\n'}
            {'    '}<span className="key">&quot;response&quot;</span>: <span className="str">&quot;...&quot;</span>{'\n'}
            {'  '}{'}'}{'\n'}
            {'}'}
          </div>
        </div>
      </div>
    </>
  )
}
