'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Nav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="site-nav">
      <style jsx>{`
        .site-nav {
          position: sticky;
          top: 0;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--rule);
          z-index: 50;
        }
        .nav-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }
        .nav-logo {
          font-family: var(--serif);
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.01em;
          text-decoration: none;
          color: var(--ink);
        }
        .nav-logo:hover {
          text-decoration: none;
        }
        .nav-links {
          display: flex;
          gap: 36px;
          list-style: none;
          align-items: center;
          margin: 0;
        }
        .nav-links a {
          color: var(--ink-2);
          font-size: 14px;
          text-decoration: none;
          font-weight: 400;
        }
        .nav-links a:hover {
          color: var(--ink);
        }
        .nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .nav-button {
          padding: 8px 16px;
          border: 1px solid var(--rule);
          background: white;
          color: var(--ink);
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .nav-button:hover {
          background: var(--bg);
        }
        .nav-button.primary {
          background: var(--ink);
          color: white;
          border-color: var(--ink);
        }
        .nav-button.primary:hover {
          background: var(--ink-2);
          border-color: var(--ink-2);
        }
        .nav-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 24px;
          color: var(--ink);
        }
        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }
          .nav-toggle {
            display: block;
          }
        }
      `}</style>
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          AgnosLogic
        </Link>
        <ul className="nav-links">
          <li>
            <Link href="/test">Live demo</Link>
          </li>
          <li>
            <Link href="/terms">Terms</Link>
          </li>
          <li>
            <Link href="/privacy">Privacy</Link>
          </li>
        </ul>
        <div className="nav-right">
          <button className="nav-button">Sign in</button>
          <button className="nav-button primary">Get API key</button>
        </div>
        <button 
          className="nav-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>
    </nav>
  )
}
