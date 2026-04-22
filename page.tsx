import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AgnosLogic — AI Hallucination Detection API | Single-Call LLM Risk Scoring',
  description:
    'AgnosLogic detects LLM hallucinations by reading hidden state geometry. 98.9% F1 on HaluEval QA. Single API call. Sub-100ms latency.',
}

export default function HomePage() {
  return (
    <>
      <style>{`
        .hero { padding: 120px 0 100px; position: relative; overflow: hidden; border-bottom: none; }
        .hero-inner { max-width: 860px; margin: 0 auto; padding: 0 32px; }
        .hero-mark { font-family: var(--mono); font-size: 12px; color: var(--ink-3); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 24px; }
        .hero h1 { margin-bottom: 28px; }
        .hero-lead { font-size: 21px; line-height: 1.5; color: var(--ink-2); max-width: 680px; margin-bottom: 40px; font-weight: 400; }
        .hero-cta { display: flex; gap: 12px; align-items: center; margin-bottom: 32px; flex-wrap: wrap; }
        .hero-meta { font-size: 13px; color: var(--ink-3); display: flex; gap: 24px; flex-wrap: wrap; }
        .hero-meta span::before { content: '• '; color: var(--ink-4); }
        .hero-meta span:first-child::before { content: ''; }

        .trust-bar { background: var(--paper-2); padding: 32px 0; border-bottom: 1px solid var(--rule); }
        .trust-inner { max-width: 1180px; margin: 0 auto; padding: 0 32px; display: flex; justify-content: space-around; gap: 48px; flex-wrap: wrap; }
        .trust-item { text-align: center; }
        .trust-num { font-family: var(--serif); font-size: 32px; font-weight: 600; color: var(--ink); line-height: 1; }
        .trust-label { font-size: 12px; color: var(--ink-3); margin-top: 6px; text-transform: uppercase; letter-spacing: 0.08em; }
        .trust-cite { font-size: 10px; color: var(--ink-4); margin-top: 4px; font-family: var(--mono); }

        .differentiator { background: var(--paper-2); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
        .diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
        .diff-right { font-family: var(--mono); font-size: 13px; background: var(--ink); color: var(--paper-2); padding: 32px; border-radius: 8px; line-height: 1.9; overflow-x: auto; white-space: pre; }
        .diff-right .comment { color: #71717a; }
        .diff-right .str { color: #a7f3d0; }
        .diff-right .key { color: #c4b5fd; }

        .how-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px; margin-top: 48px; }
        .how-num { font-family: var(--serif); font-size: 48px; color: var(--rule-2); font-weight: 400; line-height: 1; margin-bottom: 16px; font-style: italic; }

        .code-demo { background: var(--ink); color: #e8e8e8; border-radius: 8px; padding: 28px 32px; font-family: var(--mono); font-size: 13.5px; line-height: 1.75; overflow-x: auto; white-space: pre; margin-top: 32px; }
        .code-demo .comment { color: #71717a; }
        .code-demo .str { color: #a7f3d0; }
        .code-demo .key { color: #c4b5fd; }
        .code-demo .fn { color: #fbbf24; }

        .compare-table { width: 100%; border-collapse: collapse; margin-top: 32px; background: var(--paper); }
        .compare-table th { text-align: left; padding: 16px 20px; font-size: 13px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid var(--ink); }
        .compare-table td { padding: 16px 20px; border-bottom: 1px solid var(--rule); font-size: 15px; }
        .compare-table td:first-child { font-weight: 500; color: var(--ink); }
        .check { color: var(--green); font-weight: 600; }
        .cross { color: var(--ink-4); }

        .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
        .price-card { border: 1px solid var(--rule); border-radius: 10px; padding: 36px 32px; background: var(--paper); display: flex; flex-direction: column; position: relative; }
        .price-card.featured { border: 1px solid var(--ink); box-shadow: 0 0 0 1px var(--ink); }
        .price-badge { position: absolute; top: -11px; left: 32px; background: var(--ink); color: var(--paper); font-size: 11px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
        .price-name { font-family: var(--serif); font-size: 22px; margin-bottom: 4px; color: var(--ink); }
        .price-desc { color: var(--ink-3); font-size: 14px; margin-bottom: 24px; }
        .price-amount { font-family: var(--serif); font-size: 48px; font-weight: 500; line-height: 1; color: var(--ink); }
        .price-amount .period { font-size: 16px; color: var(--ink-3); font-weight: 400; font-family: var(--sans); }
        .price-meta { font-size: 13px; color: var(--ink-3); margin-bottom: 28px; margin-top: 4px; }
        .price-features { list-style: none; margin-bottom: 28px; flex: 1; }
        .price-features li { padding: 8px 0; font-size: 14px; color: var(--ink-2); display: flex; gap: 10px; align-items: flex-start; }
        .price-features li::before { content: '✓'; color: var(--green); font-weight: 600; flex-shrink: 0; }

        .section-head { margin-bottom: 16px; max-width: 720px; }

        @media (max-width: 768px) {
          .diff-grid { grid-template-columns: 1fr; gap: 40px; }
          .how-grid { grid-template-columns: 1fr; gap: 32px; }
          .pricing-grid { grid-template-columns: 1fr; gap: 16px; }
          .hero { padding: 72px 0 60px; }
        }
      `}</style>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-mark">Agnos Logic · v51h</div>
          <h1>
            Know when your language model is <em>making things up.</em>
          </h1>
          <p className="hero-lead">
            AgnosLogic reads the model&apos;s own hidden state geometry to detect hallucinations in a single forward pass. No judge LLM. No retrieval augmentation. No extra inference calls.
          </p>
          <div className="hero-cta">
            <Link href="/test" className="btn btn-primary">Try the live demo</Link>
            <Link href="/docs" className="btn btn-ghost">Read the docs</Link>
          </div>
          <div className="hero-meta">
            <span>Single API call</span>
            <span>Sub-100ms latency</span>
            <span>15 free queries/day</span>
          </div>
        </div>
      </section>

      <div className="trust-bar">
        <div className="trust-inner">
          <div className="trust-item">
            <div className="trust-num">98.9%</div>
            <div className="trust-label">F1 Score</div>
            <div className="trust-cite">HaluEval QA · 10K</div>
          </div>
          <div className="trust-item">
            <div className="trust-num">93.9%</div>
            <div className="trust-label">F1 Score</div>
            <div className="trust-cite">TruthfulQA</div>
          </div>
          <div className="trust-item">
            <div className="trust-num">100%</div>
            <div className="trust-label">Comparison Accuracy</div>
            <div className="trust-cite">FreshQA</div>
          </div>
          <div className="trust-item">
            <div className="trust-num">2.2%</div>
            <div className="trust-label">False Positive Rate</div>
            <div className="trust-cite">HaluEval QA</div>
          </div>
          <div className="trust-item">
            <div className="trust-num">&lt;100ms</div>
            <div className="trust-label">Inference Latency</div>
            <div className="trust-cite">A100 80GB</div>
          </div>
        </div>
      </div>

      <section className="differentiator">
        <div className="container">
          <div className="diff-grid">
            <div>
              <div className="eyebrow">The difference</div>
              <h2>
                Every other tool calls a <em>second</em> LLM to judge the first.
              </h2>
              <p className="lead" style={{ marginTop: 20 }}>
                Galileo, Datadog, LangSmith, OpenAI Guardrails — they all use LLM-as-a-judge or retrieval grounding. Both approaches add latency, cost, and another source of hallucination.
              </p>
              <p className="lead" style={{ marginTop: 16 }}>
                AgnosLogic is different. We read the geometry of the model&apos;s own hidden states. One forward pass. No second model. Calibrated risk score returned with the response.
              </p>
              <p style={{ marginTop: 24 }}>
                <Link href="/compare" style={{ fontWeight: 500 }}>See full comparison →</Link>
              </p>
            </div>
            <div className="diff-right">
              <span className="comment"># One call. Both outputs.</span>{'\n'}
              <span className="key">POST</span> /v1/ask{'\n'}
              {'{'}{'\n'}
              {'  '}<span className="str">&quot;question&quot;</span>: <span className="str">&quot;How does</span>{'\n'}
              {'  '}<span className="str">antibiotic resistance develop?&quot;</span>{'\n'}
              {'}'}{'\n\n'}
              <span className="comment"># Response</span>{'\n'}
              {'{'}{'\n'}
              {'  '}<span className="str">&quot;response&quot;</span>: <span className="str">&quot;...&quot;</span>,{'\n'}
              {'  '}<span className="str">&quot;verdict&quot;</span>: <span className="str">&quot;verified&quot;</span>,{'\n'}
              {'  '}<span className="str">&quot;latency_ms&quot;</span>: 87{'\n'}
              {'}'}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container-narrow">
          <div className="section-head">
            <div className="eyebrow">How it works</div>
            <h2>Hidden state geometry, not vibes.</h2>
            <p className="lead" style={{ marginTop: 16 }}>
              AgnosLogic augments a frozen language model with three auxiliary probes that read the model&apos;s internal representations. The geometry of truthful and fabricated content separates cleanly — we learn that separation once and score every query in a single forward pass.
            </p>
          </div>
          <div className="how-grid">
            <div>
              <div className="how-num">i.</div>
              <h3>Send your query</h3>
              <p>POST to the API with a question. The model generates an answer in a single forward pass on our A100 infrastructure.</p>
            </div>
            <div>
              <div className="how-num">ii.</div>
              <h3>Hidden state analysis</h3>
              <p>Three auxiliary heads — FAH, CWMI, ESR — read the model&apos;s internal states. A learned probe detects fabrication from hidden-state geometry alone.</p>
            </div>
            <div>
              <div className="how-num">iii.</div>
              <h3>Verdict returned</h3>
              <p>You receive the answer with a calibrated verdict: <strong>Verified</strong>, <strong>Uncertain</strong>, or <strong>Flagged</strong>. Sub-100ms latency on production GPUs.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--paper-2)' }}>
        <div className="container-narrow">
          <div className="section-head">
            <div className="eyebrow">Live API</div>
            <h2>Three endpoints. Zero complexity.</h2>
            <p className="lead" style={{ marginTop: 16 }}>
              RESTful JSON. Bearer-token auth. Under 10 lines of code in any language.
            </p>
          </div>
          <div className="code-demo">
            <span className="comment"># Python · Analyze any claim in a single call</span>{'\n'}
            <span className="key">import</span> requests{'\n\n'}
            response = requests.post({'\n'}
            {'    '}<span className="str">&quot;https://www.agnoslogic.com/v1/ask&quot;</span>,{'\n'}
            {'    '}headers={'{'}<span className="str">&quot;Authorization&quot;</span>: <span className="str">&quot;Bearer YOUR_API_KEY&quot;</span>{'}'},{'\n'}
            {'    '}json={'{'}<span className="str">&quot;question&quot;</span>: <span className="str">&quot;What year did World War II end?&quot;</span>{'}'}{'\n'}
            ){'\n\n'}
            data = response.json(){'\n'}
            <span className="fn">print</span>(data[<span className="str">&quot;response&quot;</span>]){'    '}<span className="comment"># Generated answer</span>{'\n'}
            <span className="fn">print</span>(data[<span className="str">&quot;verdict&quot;</span>]){'     '}<span className="comment"># &quot;verified&quot; | &quot;uncertain&quot; | &quot;flagged&quot;</span>{'\n'}
            <span className="fn">print</span>(data[<span className="str">&quot;latency_ms&quot;</span>]){'  '}<span className="comment"># &lt;100 on GPU</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href="/docs" className="btn btn-ghost">Full API reference →</Link>
          </div>
        </div>
      </section>

      <section>
        <div className="container-narrow">
          <div className="section-head">
            <div className="eyebrow">Comparison</div>
            <h2>How AgnosLogic compares.</h2>
          </div>
          <table className="compare-table">
            <thead>
              <tr>
                <th></th>
                <th style={{ textAlign: 'center' }}>AgnosLogic</th>
                <th style={{ textAlign: 'center' }}>LLM-as-judge</th>
                <th style={{ textAlign: 'center' }}>RAG grounding</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Single forward pass</td>
                <td style={{ textAlign: 'center' }}><span className="check">✓</span></td>
                <td style={{ textAlign: 'center' }}><span className="cross">—</span></td>
                <td style={{ textAlign: 'center' }}><span className="cross">—</span></td>
              </tr>
              <tr>
                <td>Sub-100ms latency</td>
                <td style={{ textAlign: 'center' }}><span className="check">✓</span></td>
                <td style={{ textAlign: 'center' }}><span className="cross">—</span></td>
                <td style={{ textAlign: 'center' }}><span className="cross">—</span></td>
              </tr>
              <tr>
                <td>No second LLM required</td>
                <td style={{ textAlign: 'center' }}><span className="check">✓</span></td>
                <td style={{ textAlign: 'center' }}><span className="cross">—</span></td>
                <td style={{ textAlign: 'center' }}><span className="check">✓</span></td>
              </tr>
              <tr>
                <td>Works without retrieval corpus</td>
                <td style={{ textAlign: 'center' }}><span className="check">✓</span></td>
                <td style={{ textAlign: 'center' }}><span className="check">✓</span></td>
                <td style={{ textAlign: 'center' }}><span className="cross">—</span></td>
              </tr>
              <tr>
                <td>Calibrated risk score</td>
                <td style={{ textAlign: 'center' }}><span className="check">✓</span></td>
                <td style={{ textAlign: 'center' }}><span className="cross">—</span></td>
                <td style={{ textAlign: 'center' }}><span className="cross">—</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="pricing">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', margin: '0 auto 16px' }}>
            <div className="eyebrow">Pricing</div>
            <h2>Pay for what you use.</h2>
            <p className="lead" style={{ marginTop: 16, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
              Start free. Upgrade when you&apos;re ready.
            </p>
          </div>
          <div className="pricing-grid">
            <div className="price-card">
              <div className="price-name">Explorer</div>
              <div className="price-desc">Try AgnosLogic on your data</div>
              <div className="price-amount">$0<span className="period"> / month</span></div>
              <div className="price-meta">15 queries per day</div>
              <ul className="price-features">
                <li>All three API endpoints</li>
                <li>Full verdict breakdown</li>
                <li>Community support</li>
              </ul>
              <Link href="/dashboard" className="btn btn-ghost" style={{ width: '100%', textAlign: 'center' }}>
                Get free API key
              </Link>
            </div>
            <div className="price-card featured">
              <div className="price-badge">Popular</div>
              <div className="price-name">Builder</div>
              <div className="price-desc">For production deployments</div>
              <div className="price-amount">$49<span className="period"> / month</span></div>
              <div className="price-meta">10,000 queries per month</div>
              <ul className="price-features">
                <li>Everything in Explorer</li>
                <li>Priority inference queue</li>
                <li>Usage analytics dashboard</li>
                <li>Webhook notifications</li>
                <li>Email support</li>
              </ul>
              <a href="mailto:hello@agnoslogic.com?subject=Builder%20upgrade" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                Start free trial
              </a>
            </div>
            <div className="price-card">
              <div className="price-name">Enterprise</div>
              <div className="price-desc">Custom deployment + SLA</div>
              <div className="price-amount">Custom</div>
              <div className="price-meta">Unlimited queries</div>
              <ul className="price-features">
                <li>Everything in Builder</li>
                <li>Dedicated endpoint</li>
                <li>Custom fine-tuning</li>
                <li>On-premise option</li>
                <li>SLA + dedicated support</li>
              </ul>
              <a href="mailto:hello@agnoslogic.com?subject=Enterprise" className="btn btn-ghost" style={{ width: '100%', textAlign: 'center' }}>
                Contact sales
              </a>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--ink)', color: 'var(--paper)', borderBottom: 'none' }}>
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--paper)', fontFamily: 'var(--serif)', fontWeight: 400 }}>
            Ready to build trustworthy AI?
          </h2>
          <p className="lead" style={{ color: '#d4d4d0', margin: '20px auto 36px', maxWidth: 540 }}>
            Sign up in 30 seconds. Free API key. No credit card required.
          </p>
          <Link href="/dashboard" className="btn btn-inverse">Start free with Google</Link>
        </div>
      </section>
    </>
  )
}
