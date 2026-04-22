import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Use Cases',
  description: 'Real applications of AgnosLogic: RAG hallucination firewalls, research assistants, compliance review, code analysis agents.',
}

const CASES = [
  {
    title: 'RAG hallucination firewall',
    scenario: 'Score every LLM response before showing it to users. Block or flag outputs automatically. Route uncertain responses through additional verification.',
    example: '"Our customer support bot answered 12,000 questions last month. We used AgnosLogic to flag 430 as high-risk — 89% of those flagged were genuinely hallucinated."',
    how: 'POST every LLM output to /v1/score before returning. Show "verified" directly, route "uncertain" through retrieval, block or rewrite "flagged".',
  },
  {
    title: 'Research assistant with confidence',
    scenario: 'Generate an answer and tell the user how confident the model is. Route uncertain answers to web search. Deliver verified answers directly.',
    example: '"Question: What was the name of the first satellite? Answer: Sputnik 1, launched October 4, 1957. [Verified]"',
    how: 'Use /v1/ask to get answer + verdict in one call. Display the verdict next to the answer. Fall back to search for "flagged" or "uncertain" results.',
  },
  {
    title: 'Legal and compliance review',
    scenario: 'Flag uncertain claims in contracts, regulatory filings, and compliance documents. AI-generated summaries often contain fabricated citations or altered figures.',
    example: '"Our paralegal team runs all AI-drafted summaries through AgnosLogic. Caught three fabricated case citations last quarter."',
    how: 'Split documents into sentences, score each via /v1/score, highlight flagged spans in the UI for human review.',
  },
  {
    title: 'Code review agents',
    scenario: 'When an AI explains a bug or suggests a fix, score the explanation. High-risk explanations often contain made-up API methods or invented syntax.',
    example: '"The AI suggested using pandas.to_blockchain() to export data. [Flagged] — that method doesn\'t exist."',
    how: 'Score AI-generated code explanations. High-risk outputs get auto-verified against documentation or flagged for human review.',
  },
  {
    title: 'Medical and scientific writing',
    scenario: 'Fabricated drug interactions, invented research citations, and made-up clinical trial data can cause real harm. Score AI-generated medical content before publication.',
    example: '"We score every AI-drafted patient education document. High-risk sections trigger expert review."',
    how: 'Combine /v1/score with domain expert review for all "flagged" content. Never ship unverified content for high-stakes domains.',
  },
  {
    title: 'Evaluation and benchmarking',
    scenario: 'Comparing two LLMs? Run their outputs through /v1/compare to see which produces more trustworthy responses on your specific prompts.',
    example: '"We ran 500 questions through Qwen-72B and our fine-tuned model. /v1/compare showed our model had 23% fewer flagged responses."',
    how: 'Use /v1/compare for pairwise evaluations. Aggregate verdicts across your test set to compare models objectively.',
  },
]

export default function UseCasesPage() {
  return (
    <>
      <style>{`
        .uc-hero { padding: 72px 0 56px; border-bottom: none; }
        .uc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 48px; }
        .uc-card { padding: 40px; border: 1px solid var(--rule); border-radius: 10px; background: var(--paper); transition: border-color 0.15s; }
        .uc-card:hover { border-color: var(--ink-3); }
        .uc-card h3 { font-size: 22px; margin-bottom: 16px; font-family: var(--serif); }
        .uc-scenario { font-size: 14px; color: var(--ink-2); line-height: 1.65; margin-bottom: 20px; }
        .uc-example { background: var(--paper-2); border-left: 3px solid var(--ink); padding: 16px 20px; margin-top: 20px; font-size: 13.5px; line-height: 1.6; font-family: var(--serif); color: var(--ink-2); font-style: italic; }
        .uc-how { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--rule); font-size: 13px; color: var(--ink-3); }
        .uc-how strong { color: var(--ink-2); font-weight: 600; }
        @media (max-width: 768px) {
          .uc-grid { grid-template-columns: 1fr; gap: 20px; }
        }
      `}</style>

      <section className="uc-hero">
        <div className="container-narrow">
          <div className="eyebrow">Use cases</div>
          <h1>Built for developers shipping AI in production.</h1>
          <p className="lead">Six real applications where single-call hallucination detection changes what&apos;s possible.</p>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="uc-grid">
            {CASES.map((c) => (
              <div className="uc-card" key={c.title}>
                <h3>{c.title}</h3>
                <p className="uc-scenario">{c.scenario}</p>
                <div className="uc-example">{c.example}</div>
                <div className="uc-how"><strong>How:</strong> {c.how}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--paper-2)' }}>
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <h2>Have a use case we haven&apos;t covered?</h2>
          <p className="lead" style={{ margin: '16px auto 28px', maxWidth: 540 }}>
            Reach out and we&apos;ll help you design an integration.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="mailto:hello@agnoslogic.com?subject=Use%20case%20inquiry" className="btn btn-primary">Email us</a>
            <Link href="/dashboard" className="btn btn-ghost">Get API key</Link>
          </div>
        </div>
      </section>
    </>
  )
}
