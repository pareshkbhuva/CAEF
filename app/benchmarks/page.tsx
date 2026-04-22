import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Benchmarks',
  description:
    'AgnosLogic benchmark results on HaluEval QA, TruthfulQA, FreshQA, and BullshitBench. All evaluations reproducible via the public API.',
}

export default function BenchmarksPage() {
  return (
    <>
      <style>{`
        .bench-hero { padding: 72px 0 56px; border-bottom: none; }
        .bench-table { width: 100%; border-collapse: collapse; margin-top: 32px; }
        .bench-table th { text-align: left; padding: 14px 16px; font-size: 13px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid var(--ink); background: var(--paper-2); }
        .bench-table th:not(:first-child) { text-align: right; }
        .bench-table td { padding: 16px; border-bottom: 1px solid var(--rule); font-size: 15px; }
        .bench-table td:first-child { font-weight: 500; }
        .bench-table td:not(:first-child) { text-align: right; font-family: var(--mono); font-size: 14px; }
        .bench-name { font-family: var(--serif); font-weight: 500; }
        .bench-cite { font-size: 12px; color: var(--ink-3); margin-top: 2px; font-family: var(--sans); }
        .big-stat { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-top: 48px; }
        .big-stat-card { padding: 28px; border: 1px solid var(--rule); border-radius: 10px; background: var(--paper); }
        .big-stat-num { font-family: var(--serif); font-size: 42px; font-weight: 500; color: var(--ink); line-height: 1; }
        .big-stat-label { font-size: 13px; color: var(--ink-2); margin-top: 10px; font-weight: 500; }
        .big-stat-cite { font-size: 11px; color: var(--ink-3); margin-top: 6px; font-family: var(--mono); }
        .method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; }
        .method-card { padding: 28px; background: var(--paper-2); border-radius: 10px; border: 1px solid var(--rule); }
        .cite-box { background: var(--paper-2); border-left: 3px solid var(--ink); padding: 20px 28px; margin-top: 32px; font-size: 14px; line-height: 1.7; color: var(--ink-2); font-family: var(--serif); font-style: italic; }
        @media (max-width: 768px) {
          .big-stat { grid-template-columns: repeat(2, 1fr); }
          .method-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <section className="bench-hero">
        <div className="container-narrow">
          <div className="eyebrow">Benchmarks</div>
          <h1>Reproducible results on public benchmarks.</h1>
          <p className="lead">
            Every number on this page is measurable via our public API. We publish our methodology, evaluation code, and raw results so researchers and buyers can verify our claims independently.
          </p>
        </div>
      </section>

      <section>
        <div className="container-narrow">
          <div className="eyebrow">Headline results</div>
          <h2>v51h — current production model</h2>
          <p style={{ marginTop: 12 }}>
            Qwen3-32B backbone augmented with CAEF architecture (FAH + CWMI + ESR + MLP probe). Trained on 10,416 labeled hallucination pairs from HaluEval, TruthfulQA, HellaSwag, Winogrande, MNLI, and ARC-Challenge.
          </p>
          <div className="big-stat">
            <div className="big-stat-card">
              <div className="big-stat-num">98.9%</div>
              <div className="big-stat-label">F1 Score</div>
              <div className="big-stat-cite">HaluEval QA · 10,000 samples</div>
            </div>
            <div className="big-stat-card">
              <div className="big-stat-num">93.9%</div>
              <div className="big-stat-label">F1 Score</div>
              <div className="big-stat-cite">TruthfulQA · 817 samples</div>
            </div>
            <div className="big-stat-card">
              <div className="big-stat-num">100%</div>
              <div className="big-stat-label">Comparison Accuracy</div>
              <div className="big-stat-cite">FreshQA · 19 pairs</div>
            </div>
            <div className="big-stat-card">
              <div className="big-stat-num">83.3%</div>
              <div className="big-stat-label">Accuracy</div>
              <div className="big-stat-cite">BullshitBench v2 · 24 tests</div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container-narrow">
          <div className="eyebrow">Full results</div>
          <h2>Detailed benchmark breakdown</h2>
          <table className="bench-table">
            <thead>
              <tr>
                <th>Benchmark</th>
                <th>Samples</th>
                <th>Recall</th>
                <th>FPR</th>
                <th>F1</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="bench-name">HaluEval QA</div>
                  <div className="bench-cite">Li et al., 2023</div>
                </td>
                <td>10,000</td>
                <td>100.0%</td>
                <td>2.2%</td>
                <td>98.9%</td>
              </tr>
              <tr>
                <td>
                  <div className="bench-name">TruthfulQA</div>
                  <div className="bench-cite">Lin et al., 2022</div>
                </td>
                <td>817</td>
                <td>92.2%</td>
                <td>4.0%</td>
                <td>93.9%</td>
              </tr>
              <tr>
                <td>
                  <div className="bench-name">FreshQA</div>
                  <div className="bench-cite">Vu et al., 2023</div>
                </td>
                <td>19</td>
                <td>68.4%</td>
                <td>0.0%</td>
                <td>81.3%</td>
              </tr>
              <tr>
                <td>
                  <div className="bench-name">BullshitBench v2</div>
                  <div className="bench-cite">Gostev, 2026</div>
                </td>
                <td>24</td>
                <td>73.3%</td>
                <td>22.2%</td>
                <td>83.3%</td>
              </tr>
            </tbody>
          </table>

          <div className="cite-box">
            All benchmarks evaluated against the deployed production API. Response times observed between 71–123ms on RunPod serverless A100 80GB. Benchmark scripts and raw results available on request.
          </div>
        </div>
      </section>

      <section>
        <div className="container-narrow">
          <div className="eyebrow">Methodology</div>
          <h2>How we benchmark.</h2>
          <div className="method-grid">
            <div className="method-card">
              <h3>Comparison accuracy</h3>
              <p>
                For paired benchmarks (HaluEval, TruthfulQA, FreshQA), we score each pair and check whether the hallucinated version scores higher than the correct version. This avoids threshold tuning.
              </p>
            </div>
            <div className="method-card">
              <h3>F1, Recall, FPR</h3>
              <p>
                For single-claim benchmarks, we use a fixed threshold (0.39) optimized on a held-out training split. Recall measures fraction of hallucinations caught; FPR measures fraction of true facts incorrectly flagged.
              </p>
            </div>
            <div className="method-card">
              <h3>No test-set leakage</h3>
              <p>
                Training data excludes test splits of all benchmark datasets. HaluEval QA test set (10K) was never seen during training. TruthfulQA training used only 805 pairs from a disjoint set.
              </p>
            </div>
            <div className="method-card">
              <h3>Reproducibility</h3>
              <p>
                Every number above can be reproduced by calling our public API on the respective benchmark datasets. We publish the evaluation notebook used for FreshQA and BullshitBench on request.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container-narrow">
          <div className="eyebrow">Known limitations</div>
          <h2>Where AgnosLogic struggles.</h2>
          <p className="lead" style={{ marginTop: 16 }}>
            We publish failure modes because hiding them doesn&apos;t make them go away.
          </p>
          <div style={{ marginTop: 32 }}>
            <h3 style={{ marginBottom: 8 }}>Novel fabrications about non-existent entities</h3>
            <p>
              When the model has zero training signal on an entity (e.g., &quot;Grok-4 has 314B parameters&quot;), there is no contradictory representation to detect. The model generates plausible text with hidden states similar to genuine knowledge. This is a fundamental ceiling.
            </p>
          </div>
          <div style={{ marginTop: 28 }}>
            <h3 style={{ marginBottom: 8 }}>Adversarial paraphrases of training data</h3>
            <p>
              HaluEval&apos;s paired format may be detected partly by surface cues rather than hidden-state semantics alone. Our 98.9% F1 on HaluEval should be interpreted in that context.
            </p>
          </div>
          <div style={{ marginTop: 28 }}>
            <h3 style={{ marginBottom: 8 }}>Model-specific training required</h3>
            <p>
              The current v51h model works only with Qwen3-32B. Porting to Gemma, LLaMA, or GPT-OSS requires retraining the probes. We are working on a model-agnostic approach for v52.
            </p>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--paper-2)' }}>
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <h2>Test it yourself.</h2>
          <p className="lead" style={{ margin: '16px auto 28px', maxWidth: 480 }}>
            Sign up for a free API key and run these benchmarks on your own data.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard" className="btn btn-primary">Get API key</Link>
            <Link href="/test" className="btn btn-ghost">Try live demo</Link>
          </div>
        </div>
      </section>
    </>
  )
}
