'use client'

import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'

export default function Nav() {
  const [isAuthEnabled, setIsAuthEnabled] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  // Only use useSession if auth is properly configured
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          if (data && data.user) {
            setSession(data)
            setStatus('authenticated')
          } else {
            setStatus('unauthenticated')
          }
          setIsAuthEnabled(true)
        } else {
          setStatus('unauthenticated')
          setIsAuthEnabled(false)
        }
      } catch {
        setStatus('unauthenticated')
        setIsAuthEnabled(false)
      }
    }
    checkAuth()
  }, [])

  const handleSignIn = () => {
    if (isAuthEnabled) {
      signIn('google')
    } else {
      alert('Authentication is not configured. Please set up NEXTAUTH_URL and other required environment variables.')
    }
  }

  const handleSignInDashboard = () => {
    if (isAuthEnabled) {
      signIn('google', { callbackUrl: '/dashboard' })
    } else {
      alert('Authentication is not configured. Please set up NEXTAUTH_URL and other required environment variables.')
    }
  }

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
        .nav-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
        }
        .sign-link {
          color: var(--ink-2);
          font-size: 14px;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          font-family: var(--sans);
          padding: 0;
        }
        .sign-link:hover {
          color: var(--ink);
          text-decoration: underline;
        }
        @media (max-width: 768px) {
          .nav-links {
            display: none;
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
            <Link href="/benchmarks">Benchmarks</Link>
          </li>
          <li>
            <Link href="/docs">Documentation</Link>
          </li>
          <li>
            <Link href="/compare">Compare</Link>
          </li>
          <li>
            <Link href="/use-cases">Use cases</Link>
          </li>
        </ul>
        <div className="nav-right">
          {status === 'loading' ? null : session ? (
            <>
              <Link href="/dashboard" className="btn btn-ghost">
                Dashboard
              </Link>
              {session.user?.image && (
                <img
                  src={session.user.image}
                  className="nav-avatar"
                  referrerPolicy="no-referrer"
                  alt=""
                />
              )}
              <button onClick={() => signOut({ callbackUrl: '/' })} className="sign-link">
                Sign out
              </button>
            </>
          ) : (
            <>
              <button onClick={handleSignIn} className="sign-link">
                Sign in
              </button>
              <button onClick={handleSignInDashboard} className="btn btn-primary">
                Get API key
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
