import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AgnosLogic vs Galileo, Datadog, OpenAI Guardrails',
  description:
    'How AgnosLogic compares to LLM-as-a-judge tools and RAG grounding systems. Single forward pass vs second LLM calls.',
}

export default function ComparePage() {
  return (
    <>
      <style>{`
        .compare-hero { padding: 72px 0 48px; border-bottom: none; }
        .approach-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 40px; }
        .approach-card { padding: 32px; border: 1px solid var(--rule); border-radius: 10px; background: var(--paper); }
        .approach-card.highlight { border: 2px solid var(--ink); }
        .approach-tag { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-3); font-weight: 600; margin-bottom: 10px; }
        .approach-card.highlight .approach-tag { color: var(--ink); }
        .approach-card h3 { margin-bottom: 12px; }
        .approach-companies { font-size: 13px; color: var(--ink-3); margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--rule); }
        .approach-pros, .approach-cons { margin-top: 12px; font-size: 14px; }
        .approach-pros { color: var(--green); }
        .approach-cons { color: var(--accent); }
        .comparison-table { width: 100%; border-collapse: collapse; margin: 48px 0; font-size: 14px; background: var(--paper); }
        .comparison-table th { text-align: left; padding: 16px; font-size: 12px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid var(--ink); vertical-align: top; }
        .comparison-table th:not(:first-child) { text-align: center; min-width: 120px; }
        .comparison-table th.us { color: var(--ink); background: var(--paper-2); }
        .comparison-table td { padding: 14px 16px; border-bottom: 1px solid var(--rule); }
        .comparison-table td:not(:first-child) { text-align: center; }
        .comparison-table td.us { background: var(--paper-2); font-weight: 500; }
        .yes { color: var(--green); font-weight: 600; font-size: 16px; }
        .no { color: var(--ink-4); font-size: 16px; }
        .partial { color: var(--amber); font-weight: 600; }
        .latency-chart { margin: 40px 0; background: var(--paper); border: 1px solid var(--rule); border-radius: 10px; padding: 32px; }
        .bar-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
        .bar-label { width: 180px; font-size: 14px; font-weight: 500; flex-shrink: 0; }
        .bar-wrap { flex: 1; position: relative; height: 28px; background: var(--paper-3); border-radius: 4px; overflow: hidden; }
        .bar-fill { position: absolute; top: 0; left: 0; bottom: 0; background: var(--ink); display: flex; align-items: center; padding-left: 12px; color: var(--paper); font-size: 12px; font-weight: 500; font-family: var(--mono); border-radius: 4px; }
        .bar-fill.us { background: var(--green); }
        @media (max-width: 900px) {
          .approach-grid { grid-template-columns: 1fr; }
          .bar-label { width: 120px; font-size: 13px; }
        }
      `}</style>

      <section className="compare-hero">
        <div className="container-narrow">
          <div className="eyebrow">Comparison</div>
          <h1>AgnosLogic vs the alternatives.</h1>
          <p className="lead">
            There are three main approaches to hallucination detection. We explain how each works, what it costs, and where AgnosLogic fits.
          </p>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="eyebrow">Three approaches</div>
          <h2>The hallucination detection landscape</h2>
          <div className="approach-grid">
            <div className="approach-card">
              <div className="approach-tag">Approach 1</div>
              <h3>LLM-as-a-judge</h3>
              <p style={{ fontSize: 14 }}>A second LLM evaluates the first LLM&apos;s output. Usually GPT-4 or Claude scores each response for faithfulness.</p>
              <div className="approach-pros">✓ Works with any upstream LLM</div>
              <div className="approach-cons">✕ Requires 2+ API calls per check</div>
              <div className="approach-cons">✕ Judge itself can hallucinate</div>
              <div className="approach-cons">✕ 2–5× the cost per query</div>
              <div className="approach-companies">Galileo · Datadog · LangSmith · Patronus</div>
            </div>
            <div className="approach-card">
              <div className="approach-tag">Approach 2</div>
              <h3>RAG grounding</h3>
              <p style={{ fontSize: 14 }}>Compare LLM output against retrieved documents. Flag content not supported by the context.</p>
              <div className="approach-pros">✓ Very accurate when context is available</div>
              <div className="approach-cons">✕ Requires a retrieval corpus</div>
              <div className="approach-cons">✕ Can&apos;t detect out-of-context fabrications</div>
              <div className="approach-companies">Vectara · Exa · Ragas · TruLens</div>
            </div>
            <div className="approach-card highlight">
              <div className="approach-tag">Approach 3 · Ours</div>
              <h3>Hidden-state geometry</h3>
              <p style={{ fontSize: 14 }}>Read the model&apos;s own internal representations. Truthful and fabricated outputs separate cleanly in hidden-state space.</p>
              <div className="approach-pros">✓ Single forward pass</div>
              <div className="approach-pros">✓ No second LLM, no retrieval corpus</div>
              <div className="approach-pros">✓ Sub-100ms latency (warm)</div>
              <div className="approach-cons">✕ Requires model-specific training</div>
              <div className="approach-companies">AgnosLogic · (no direct competitors)</div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container-narrow">
          <div className="eyebrow">Head to head</div>
          <h2>Feature comparison</h2>
          <table className="comparison-table">
            <thead>
              <tr>
                <th></th>
                <th className="us">AgnosLogic</th>
                <th>Galileo / Datadog</th>
                <th>RAG-based tools</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Single forward pass</td>
                <td className="us"><span className="yes">✓</span></td>
                <td><span className="no">—</span></td>
                <td><span className="no">—</span></td>
              </tr>
              <tr>
                <td>Sub-100ms latency</td>
                <td className="us"><span className="yes">✓</span></td>
                <td><span className="no">—</span></td>
                <td><span className="no">—</span></td>
              </tr>
              <tr>
                <td>No second LLM required</td>
                <td className="us"><span className="yes">✓</span></td>
                <td><span className="no">—</span></td>
                <td><span className="yes">✓</span></td>
              </tr>
              <tr>
                <td>Works without retrieval corpus</td>
                <td className="us"><span className="yes">✓</span></td>
                <td><span className="yes">✓</span></td>
                <td><span className="no">—</span></td>
              </tr>
              <tr>
                <td>Calibrated risk score</td>
                <td className="us"><span className="yes">✓</span></td>
                <td><span className="partial">Partial</span></td>
                <td><span className="partial">Partial</span></td>
              </tr>
              <tr>
                <td>Detects logical contradictions</td>
                <td className="us"><span className="yes">✓</span></td>
                <td><span className="partial">Via judge</span></td>
                <td><span className="no">—</span></td>
              </tr>
              <tr>
                <td>Works on any LLM</td>
                <td className="us"><span className="partial">Open-weight only</span></td>
                <td><span className="yes">✓</span></td>
                <td><span className="yes">✓</span></td>
              </tr>
              <tr>
                <td>Cost per 1,000 checks</td>
                <td className="us"><strong>~$4.90</strong></td>
                <td>$15–50</td>
                <td>$5–20</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ background: 'var(--paper-2)' }}>
        <div className="container-narrow">
          <div className="eyebrow">Latency</div>
          <h2>Speed matters in production.</h2>
          <p className="lead" style={{ marginTop: 12 }}>
            Typical latency for a single hallucination check (warm inference, post cold-start).
          </p>
          <div className="latency-chart">
            <div className="bar-row">
              <div className="bar-label">AgnosLogic</div>
              <div className="bar-wrap"><div className="bar-fill us" style={{ width: '10%' }}>87ms</div></div>
            </div>
            <div className="bar-row">
              <div className="bar-label">RAG grounding</div>
              <div className="bar-wrap"><div className="bar-fill" style={{ width: '38%' }}>~400ms</div></div>
            </div>
            <div className="bar-row">
              <div className="bar-label">LLM-as-judge (small)</div>
              <div className="bar-wrap"><div className="bar-fill" style={{ width: '55%' }}>~600ms</div></div>
            </div>
            <div className="bar-row">
              <div className="bar-label">LLM-as-judge (GPT-4)</div>
              <div className="bar-wrap"><div className="bar-fill" style={{ width: '90%' }}>~1200ms</div></div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            Measurements based on single-query latency from p50 production traffic.
          </p>
        </div>
      </section>

      <section>
        <div className="container-narrow">
          <div className="eyebrow">When to use what</div>
          <h2>Our honest recommendation.</h2>
          <div style={{ marginTop: 32, padding: 24, background: 'var(--paper-2)', borderLeft: '3px solid var(--green)', borderRadius: 4 }}>
            <h3 style={{ marginBottom: 10 }}>Use AgnosLogic when:</h3>
            <p>
              You run open-weight models (Qwen, LLaMA, Gemma) in production and need low-latency scoring at scale. You value single-call simplicity over multi-LLM pipelines.
            </p>
          </div>
          <div style={{ marginTop: 20, padding: 24, background: 'var(--paper-2)', borderLeft: '3px solid var(--ink-3)', borderRadius: 4 }}>
            <h3 style={{ marginBottom: 10 }}>Use LLM-as-a-judge when:</h3>
            <p>
              You need to score outputs from closed models (GPT-4, Claude) where hidden states aren&apos;t accessible.
            </p>
          </div>
          <div style={{ marginTop: 20, padding: 24, background: 'var(--paper-2)', borderLeft: '3px solid var(--ink-3)', borderRadius: 4 }}>
            <h3 style={{ marginBottom: 10 }}>Use RAG grounding when:</h3>
            <p>
              You have a trusted document corpus and need to verify that answers are supported by your sources.
            </p>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--ink)', color: 'var(--paper)', borderBottom: 'none' }}>
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--paper)', fontWeight: 400 }}>Try it on your own data.</h2>
          <p className="lead" style={{ color: '#d4d4d0', margin: '16px auto 28px', maxWidth: 480 }}>
            Free API key. 15 queries per day. Compare against your current solution.
          </p>
          <Link href="/dashboard" className="btn btn-inverse">Get API key</Link>
        </div>
      </section>
    </>
  )
}
