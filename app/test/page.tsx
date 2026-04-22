'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type Mode = 'score' | 'ask'
type Verdict = 'verified' | 'uncertain' | 'flagged'

const EXAMPLES: Record<Mode, string[]> = {
  score: [
    'The Great Wall of China is visible from space.',
    'Water freezes at 0°C at standard pressure.',
    'Einstein invented the light bulb in 1879.',
  ],
  ask: [
    'What is the capital of Australia?',
    'Who invented the telephone?',
    'How does antibiotic resistance develop?',
  ],
}

const VERDICT_INFO: Record<Verdict, { icon: string; label: string; sublabel: string; pos: number }> = {
  verified: {
    icon: '✓',
    label: 'Verified',
    sublabel: "This appears factually grounded based on the model's internal state.",
    pos: 15,
  },
  uncertain: {
    icon: '?',
    label: 'Uncertain',
    sublabel: 'The model is not confident — verify independently before relying on this.',
    pos: 50,
  },
  flagged: {
    icon: '✕',
    label: 'Flagged',
    sublabel: 'Likely contains inaccurate or fabricated information.',
    pos: 85,
  },
}

function categoryToVerdict(cat: string | undefined): Verdict {
  if (cat === 'LOW') return 'verified'
  if (cat === 'HIGH') return 'flagged'
  return 'uncertain'
}

export default function TestPage() {
  const [mode, setMode] = useState<Mode>('score')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [result, setResult] = useState<{ verdict: Verdict; response?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  function reset() {
    setResult(null)
    setError(null)
    setStatus('')
  }

  async function handleSubmit() {
    const text = input.trim()
    if (!text) return

    reset()
    setLoading(true)
    setStatus('Analyzing…')

    try {
      const res = await fetch('/api/public/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, text }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Request failed')
        setLoading(false)
        return
      }

      // Case 1: synchronous completion (warm RunPod)
      if (data.category) {
        setResult({
          verdict: categoryToVerdict(data.category),
          response: data.response,
        })
        setLoading(false)
        return
      }

      // Case 2: async job — poll until complete
      if (data.jobId) {
        setStatus('Warming up inference backend… first request can take 3-4 minutes for cold start.')
        pollJob(data.jobId)
        return
      }

      setError('Unexpected response from server')
      setLoading(false)
    } catch (e) {
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  function pollJob(jobId: string) {
    const startTime = Date.now()
    const maxWait = 300_000 // 5 minutes - first request can take 3-4 mins for cold start

    const poll = async () => {
      if (Date.now() - startTime > maxWait) {
        if (pollRef.current) clearInterval(pollRef.current)
        setError('Analysis took too long. Please try again.')
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/jobs/${jobId}`)
        const data = await res.json()

        if (data.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current)
          setResult({
            verdict: categoryToVerdict(data.result?.category),
            response: data.result?.response,
          })
          setLoading(false)
        } else if (data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
          setError(data.error || 'Analysis failed')
          setLoading(false)
        }
        // else: still running, poll again
      } catch (e) {
        // network blip; keep polling
      }
    }

    pollRef.current = setInterval(poll, 2000)
    poll() // kick off immediately
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  return (
    <>
      <style>{`
        .test-hero { padding: 72px 0 40px; text-align: center; }
        .test-hero h1 { font-size: clamp(32px, 4vw, 44px); margin-bottom: 16px; }
        .test-card { max-width: 720px; margin: 40px auto 0; background: var(--paper); border: 1px solid var(--rule); border-radius: 10px; overflow: hidden; }
        .tabs { display: flex; border-bottom: 1px solid var(--rule); }
        .tab { flex: 1; padding: 18px 20px; background: none; border: none; cursor: pointer; text-align: left; font-family: var(--sans); color: var(--ink-3); transition: all 0.15s; border-bottom: 2px solid transparent; }
        .tab:hover { background: var(--paper-2); color: var(--ink-2); }
        .tab.active { color: var(--ink); border-bottom-color: var(--ink); background: var(--paper); }
        .tab-l { font-size: 15px; font-weight: 500; margin-bottom: 2px; }
        .tab-s { font-size: 13px; color: var(--ink-3); }
        .test-body { padding: 32px; }
        textarea { width: 100%; background: var(--paper); border: 1px solid var(--rule); border-radius: 6px; padding: 14px 16px; color: var(--ink); font-family: var(--sans); font-size: 15px; line-height: 1.6; resize: vertical; min-height: 110px; transition: border-color 0.15s; }
        textarea:focus { outline: none; border-color: var(--ink); }
        textarea::placeholder { color: var(--ink-4); }
        .char-count { font-size: 11px; color: var(--ink-4); margin-top: 6px; text-align: right; font-family: var(--mono); }
        .ex-wrap { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .ex-label { font-size: 12px; color: var(--ink-3); margin-right: 4px; }
        .chip { background: var(--paper-2); border: 1px solid var(--rule); border-radius: 14px; padding: 5px 11px; font-size: 12px; color: var(--ink-2); cursor: pointer; transition: all 0.15s; font-family: var(--sans); }
        .chip:hover { border-color: var(--ink-3); color: var(--ink); background: var(--paper); }
        .submit-btn { margin-top: 20px; width: 100%; padding: 13px; background: var(--ink); color: var(--paper); border: none; border-radius: 6px; font-size: 15px; font-weight: 500; cursor: pointer; font-family: var(--sans); transition: all 0.15s; }
        .submit-btn:hover:not(:disabled) { background: var(--ink-2); }
        .submit-btn:disabled { background: var(--rule-2); color: var(--ink-4); cursor: not-allowed; }
        .result { margin-top: 28px; }
        .loading-box { background: var(--paper-2); border: 1px solid var(--rule); border-radius: 8px; padding: 32px; text-align: center; color: var(--ink-3); font-size: 14px; }
        .loading-sub { font-size: 12px; color: var(--ink-4); margin-top: 8px; }
        @keyframes dot-pulse { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }
        .dots span { display: inline-block; animation: dot-pulse 1.4s infinite; }
        .dots span:nth-child(2) { animation-delay: 0.2s; }
        .dots span:nth-child(3) { animation-delay: 0.4s; }
        .verdict-card { border-radius: 10px; padding: 28px 32px; border: 1px solid; }
        .verdict-verified { background: var(--green-soft); border-color: #bbf7d0; }
        .verdict-uncertain { background: var(--amber-soft); border-color: #fde68a; }
        .verdict-flagged { background: var(--accent-soft); border-color: #fecaca; }
        .verdict-head { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
        .verdict-icon { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 20px; color: #fff; flex-shrink: 0; font-family: var(--mono); }
        .icon-verified { background: var(--green); }
        .icon-uncertain { background: var(--amber); }
        .icon-flagged { background: var(--accent); }
        .verdict-label { font-family: var(--serif); font-size: 24px; font-weight: 600; line-height: 1.1; }
        .label-verified { color: var(--green); }
        .label-uncertain { color: var(--amber); }
        .label-flagged { color: var(--accent); }
        .verdict-sub { font-size: 13.5px; color: var(--ink-2); margin-top: 3px; }
        .meter-wrap { margin: 20px 0 10px; }
        .meter { position: relative; height: 6px; border-radius: 3px; background: linear-gradient(to right, rgba(21,128,61,0.25) 0%, rgba(21,128,61,0.25) 33%, rgba(180,83,9,0.25) 33%, rgba(180,83,9,0.25) 66%, rgba(185,28,28,0.25) 66%, rgba(185,28,28,0.25) 100%); }
        .marker { position: absolute; top: -5px; width: 16px; height: 16px; border-radius: 50%; border: 3px solid var(--paper); transform: translateX(-50%); transition: left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
        .marker-verified { background: var(--green); }
        .marker-uncertain { background: var(--amber); }
        .marker-flagged { background: var(--accent); }
        .meter-labels { display: flex; justify-content: space-between; margin-top: 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; color: var(--ink-3); }
        .resp-block { margin-top: 20px; padding: 16px 18px; background: rgba(255,255,255,0.6); border: 1px solid rgba(0,0,0,0.06); border-radius: 6px; }
        .resp-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink-3); margin-bottom: 8px; font-weight: 600; }
        .resp-text { font-size: 14px; line-height: 1.65; color: var(--ink); }
        .error-box { margin-top: 16px; padding: 14px 16px; background: var(--accent-soft); border: 1px solid #fecaca; border-radius: 6px; color: var(--accent); font-size: 13px; }
        .test-foot { max-width: 720px; margin: 28px auto 0; text-align: center; font-size: 13px; color: var(--ink-3); line-height: 1.7; padding: 0 32px; }
        .test-foot a { color: var(--ink-2); font-weight: 500; }
        @media (max-width: 640px) {
          .tab-s { display: none; }
          .test-body { padding: 24px 20px; }
          .verdict-card { padding: 22px; }
        }
      `}</style>

      <div className="test-hero">
        <div className="container-narrow">
          <div className="eyebrow">Live demo</div>
          <h1>See AgnosLogic in action.</h1>
          <p className="lead">
            Paste a claim to check, or ask a question and let the model answer with a built-in verdict.
          </p>
        </div>
      </div>

      <div className="test-card">
        <div className="tabs">
          <button
            className={`tab ${mode === 'score' ? 'active' : ''}`}
            onClick={() => {
              setMode('score')
              setInput('')
              reset()
            }}
          >
            <div className="tab-l">Check a claim</div>
            <div className="tab-s">Paste text to verify</div>
          </button>
          <button
            className={`tab ${mode === 'ask' ? 'active' : ''}`}
            onClick={() => {
              setMode('ask')
              setInput('')
              reset()
            }}
          >
            <div className="tab-l">Ask &amp; verify</div>
            <div className="tab-s">Get a verified answer</div>
          </button>
        </div>

        <div className="test-body">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            placeholder={
              mode === 'score'
                ? 'Paste a statement or claim to verify…'
                : 'Ask a question — the model will answer and verify itself…'
            }
          />
          <div className="char-count">{input.length} / 2000</div>

          <div className="ex-wrap">
            <span className="ex-label">Try:</span>
            {EXAMPLES[mode].map((ex) => (
              <span key={ex} className="chip" onClick={() => setInput(ex)}>
                {ex}
              </span>
            ))}
          </div>

          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
          >
            {loading ? 'Analyzing…' : mode === 'score' ? 'Check claim' : 'Ask & verify'}
          </button>

          <div className="result">
            {loading && (
              <div className="loading-box">
                <div>
                  Analyzing
                  <span className="dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </div>
                {status && status !== 'Analyzing…' && (
                  <div className="loading-sub">{status}</div>
                )}
              </div>
            )}

            {error && !loading && <div className="error-box">{error}</div>}

            {result && !loading && (
              <div className={`verdict-card verdict-${result.verdict}`}>
                <div className="verdict-head">
                  <div className={`verdict-icon icon-${result.verdict}`}>
                    {VERDICT_INFO[result.verdict].icon}
                  </div>
                  <div>
                    <div className={`verdict-label label-${result.verdict}`}>
                      {VERDICT_INFO[result.verdict].label}
                    </div>
                    <div className="verdict-sub">{VERDICT_INFO[result.verdict].sublabel}</div>
                  </div>
                </div>
                <div className="meter-wrap">
                  <div className="meter">
                    <div
                      className={`marker marker-${result.verdict}`}
                      style={{ left: `${VERDICT_INFO[result.verdict].pos}%` }}
                    />
                  </div>
                  <div className="meter-labels">
                    <span>Verified</span>
                    <span>Uncertain</span>
                    <span>Flagged</span>
                  </div>
                </div>
                {result.response && (
                  <div className="resp-block">
                    <div className="resp-label">Model response</div>
                    <div className="resp-text">{result.response}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="test-foot">
        Powered by CAEF architecture — analyzes the model&apos;s internal hidden states in a single forward pass.
        <br />
        <Link href="/api/auth/signin">Sign up free</Link> for 15 queries/day and full API access.
      </div>

      <div style={{ height: 80 }} />
    </>
  )
}
