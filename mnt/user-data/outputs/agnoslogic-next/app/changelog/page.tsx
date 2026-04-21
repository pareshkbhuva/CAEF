import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Release notes and updates for the AgnosLogic hallucination detection API.',
}

const ENTRIES = [
  {
    date: 'April 15, 2026',
    version: 'v51h',
    badge: 'Current production',
    sections: [
      {
        title: 'Major',
        items: [
          'Trained MLP factual probe on 10,416 diverse pairs from 7 sources (HaluEval, TruthfulQA, HellaSwag, Winogrande, MNLI, ARC, hand-crafted)',
          '98.9% F1 on HaluEval QA (10K samples) — up from 94.3% in v51g',
          '100% comparison accuracy on FreshQA with 0% false positive rate',
          'Resolved bf16 deployment mismatch via forward() normalization path',
        ],
      },
      {
        title: 'Improvements',
        items: [
          'Sub-100ms inference latency on RunPod A100 80GB serverless',
          'Fixed reasoning text showing logic contradictions on verified facts',
          'Added auto-polarity correction at handler startup',
        ],
      },
    ],
  },
  {
    date: 'March 28, 2026',
    version: 'v51g',
    badge: null,
    sections: [
      {
        title: 'Major',
        items: [
          'Introduced MLP factual probe to replace linear probe — non-linear decision boundary',
          '94.3% F1 on HaluEval QA, up from 76.5% with linear probe',
        ],
      },
    ],
  },
  {
    date: 'March 23, 2026',
    version: 'Patent',
    badge: null,
    sections: [
      {
        title: '',
        items: ['US Provisional Patent filed covering the CAEF architecture (FAH + CWMI + ESR + MLP probe)'],
      },
    ],
  },
  {
    date: 'March 10, 2026',
    version: 'v51',
    badge: null,
    sections: [
      {
        title: 'Major',
        items: [
          'Dual probe architecture: separate logic and factual probes',
          'ESR-only retraining on frozen backbone',
          '62% strict accuracy on hand-crafted adversarial test set',
        ],
      },
    ],
  },
  {
    date: 'February 22, 2026',
    version: 'v48',
    badge: null,
    sections: [
      {
        title: 'Major',
        items: [
          'First production-stable model: 76.5% Logic Detection, 70% adversarial catch rate',
          '0.601 epsilon spread between true and false pairs',
          'Deployed on RunPod serverless infrastructure',
        ],
      },
    ],
  },
]

export default function ChangelogPage() {
  return (
    <>
      <style>{`
        .log-hero { padding: 72px 0 40px; border-bottom: none; }
        .log-entries { margin-top: 40px; }
        .log-entry { padding: 32px 0; border-bottom: 1px solid var(--rule); display: grid; grid-template-columns: 180px 1fr; gap: 40px; }
        .log-entry:first-of-type { padding-top: 0; }
        .log-date { font-family: var(--mono); font-size: 13px; color: var(--ink-3); }
        .log-version { font-family: var(--serif); font-size: 22px; font-weight: 600; color: var(--ink); margin-top: 4px; }
        .log-badge { display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; padding: 3px 8px; border-radius: 3px; margin-top: 8px; background: var(--green-soft); color: var(--green); }
        .log-body h3 { font-family: var(--sans); font-size: 16px; font-weight: 600; margin-bottom: 10px; margin-top: 20px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); }
        .log-body h3:first-child { margin-top: 0; }
        .log-body ul { list-style: none; padding-left: 0; }
        .log-body li { padding: 6px 0 6px 24px; position: relative; font-size: 14.5px; color: var(--ink-2); line-height: 1.6; }
        .log-body li::before { content: '→'; position: absolute; left: 0; color: var(--ink-4); font-family: var(--mono); }
        @media (max-width: 768px) {
          .log-entry { grid-template-columns: 1fr; gap: 16px; }
        }
      `}</style>

      <section className="log-hero">
        <div className="container-narrow">
          <div className="eyebrow">Changelog</div>
          <h1>What&apos;s new at AgnosLogic.</h1>
          <p className="lead">Release notes for the AgnosLogic API. Major updates, new features, and model improvements.</p>
        </div>
      </section>

      <section>
        <div className="container-narrow">
          <div className="log-entries">
            {ENTRIES.map((entry) => (
              <div className="log-entry" key={entry.version}>
                <div>
                  <div className="log-date">{entry.date}</div>
                  <div className="log-version">{entry.version}</div>
                  {entry.badge && <span className="log-badge">{entry.badge}</span>}
                </div>
                <div className="log-body">
                  {entry.sections.map((s, i) => (
                    <div key={i}>
                      {s.title && <h3>{s.title}</h3>}
                      <ul>
                        {s.items.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
