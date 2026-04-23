'use client'

import Link from 'next/link'
import { useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'

export default function Nav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { data: session, status } = useSession()

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
          gap: 28px;
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
          gap: 12px;
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
          text-decoration: none;
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
          padding: 8px;
        }
        .mobile-menu {
          display: none;
          position: absolute;
          top: 64px;
          left: 0;
          right: 0;
          background: white;
          border-bottom: 1px solid var(--rule);
          padding: 16px 32px;
          flex-direction: column;
          gap: 16px;
        }
        .mobile-menu.open {
          display: flex;
        }
        .mobile-menu a {
          color: var(--ink-2);
          font-size: 16px;
          text-decoration: none;
          padding: 8px 0;
        }
        .mobile-menu a:hover {
          color: var(--ink);
        }
        .mobile-menu-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
          padding-top: 16px;
          border-top: 1px solid var(--rule);
        }
        .user-email {
          font-size: 13px;
          color: var(--ink-2);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (max-width: 768px) {
          .nav-links,
          .nav-right {
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
            <Link href="/test">Demo</Link>
          </li>
          <li>
            <Link href="/benchmarks">Benchmarks</Link>
          </li>
          <li>
            <Link href="/docs">Docs</Link>
          </li>
          <li>
            <Link href="/compare">Compare</Link>
          </li>
          <li>
            <Link href="/pricing">Pricing</Link>
          </li>
        </ul>
        <div className="nav-right">
          {status === 'loading' ? null : session ? (
            <>
              <span className="user-email">{session.user?.email}</span>
              <button className="nav-button" onClick={() => signOut()}>
                Sign out
              </button>
              <Link href="/dashboard" className="nav-button primary">
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <button className="nav-button" onClick={() => signIn('google')}>
                Sign in
              </button>
              <Link href="/pricing" className="nav-button primary">
                Get API key
              </Link>
            </>
          )}
        </div>
        <button
          className="nav-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </div>
      <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
        <Link href="/test" onClick={() => setIsMenuOpen(false)}>
          Demo
        </Link>
        <Link href="/benchmarks" onClick={() => setIsMenuOpen(false)}>
          Benchmarks
        </Link>
        <Link href="/docs" onClick={() => setIsMenuOpen(false)}>
          Docs
        </Link>
        <Link href="/compare" onClick={() => setIsMenuOpen(false)}>
          Compare
        </Link>
        <Link href="/pricing" onClick={() => setIsMenuOpen(false)}>
          Pricing
        </Link>
        <div className="mobile-menu-buttons">
          {session ? (
            <>
              <button className="nav-button" onClick={() => signOut()}>
                Sign out
              </button>
              <Link
                href="/dashboard"
                className="nav-button primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <button className="nav-button" onClick={() => signIn('google')}>
                Sign in
              </button>
              <Link
                href="/pricing"
                className="nav-button primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Get API key
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
