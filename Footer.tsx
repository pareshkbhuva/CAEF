import Link from 'next/link'

export default function Footer() {
  return (
    <footer>
      <style>{`
        .site-footer {
          background: var(--paper-2);
          border-top: 1px solid var(--rule);
          padding: 56px 0 32px;
        }
        .footer-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 32px;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
          margin-bottom: 40px;
        }
        .footer-col h4 {
          font-family: var(--sans);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--ink-3);
          font-weight: 600;
          margin-bottom: 16px;
        }
        .footer-col ul {
          list-style: none;
        }
        .footer-col li {
          margin-bottom: 10px;
        }
        .footer-col a {
          color: var(--ink-2);
          font-size: 14px;
          text-decoration: none;
        }
        .footer-col a:hover {
          color: var(--ink);
          text-decoration: underline;
        }
        .footer-brand {
          font-family: var(--serif);
          font-size: 20px;
          margin-bottom: 12px;
          color: var(--ink);
        }
        .footer-tag {
          color: var(--ink-3);
          font-size: 14px;
          max-width: 300px;
          line-height: 1.5;
        }
        .footer-bottom {
          border-top: 1px solid var(--rule);
          padding-top: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--ink-3);
          font-size: 13px;
        }
        .footer-bottom a {
          color: var(--ink-3);
          text-decoration: none;
        }
        .footer-bottom a:hover {
          color: var(--ink);
        }
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }
          .footer-brand {
            grid-column: 1 / -1;
          }
        }
      `}</style>
      <div className="site-footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="footer-brand">AgnosLogic</div>
              <p className="footer-tag">
                Hallucination detection for language models. Reads hidden state geometry — no judge LLM, no RAG, no extra inference calls.
              </p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li><Link href="/test">Live demo</Link></li>
                <li><Link href="/docs">API documentation</Link></li>
                <li><Link href="/benchmarks">Benchmarks</Link></li>
                <li><Link href="/changelog">Changelog</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><Link href="/use-cases">Use cases</Link></li>
                <li><Link href="/compare">Compare</Link></li>
                <li><a href="mailto:hello@agnoslogic.com">Contact</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><Link href="/privacy">Privacy</Link></li>
                <li><Link href="/terms">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div>© 2026 Agnos Research · US Provisional Patent Filed</div>
            <div><a href="mailto:hello@agnoslogic.com">hello@agnoslogic.com</a></div>
          </div>
        </div>
      </div>
    </footer>
  )
}
