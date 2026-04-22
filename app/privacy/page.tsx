import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        .legal { padding: 72px 0 80px; border-bottom: none; }
        .legal h1 { font-size: 42px; margin-bottom: 16px; font-weight: 500; }
        .legal h2 { font-size: 24px; margin-top: 40px; margin-bottom: 14px; }
        .legal p { margin-bottom: 16px; color: var(--ink-2); font-size: 16px; line-height: 1.7; }
        .legal ul { margin-bottom: 16px; padding-left: 24px; color: var(--ink-2); }
        .legal li { margin-bottom: 8px; line-height: 1.6; }
        .legal strong { color: var(--ink); }
        .meta-bar { font-size: 13px; color: var(--ink-3); margin-bottom: 32px; font-family: var(--mono); }
      `}</style>
      <section className="legal">
        <div className="container-prose">
          <div className="eyebrow">Legal</div>
          <h1>Privacy Policy</h1>
          <div className="meta-bar">Last updated: April 19, 2026</div>

          <p>
            This Privacy Policy describes how Agnos Logic (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, and protects information about users of AgnosLogic (the &quot;Service&quot;), accessible at agnoslogic.com.
          </p>

          <h2>Information we collect</h2>
          <p>When you sign up using Google OAuth, we receive: your email address, name, profile picture URL, and Google account ID. We do not receive your Google password.</p>
          <p>When you use the API, we log:</p>
          <ul>
            <li>The endpoint called (e.g. /v1/score)</li>
            <li>Response latency and verdict category</li>
            <li>A truncated sample (first 200 characters) of the input text for abuse prevention and debugging</li>
            <li>Timestamp of the request</li>
          </ul>

          <h2>How we use information</h2>
          <ul>
            <li>To operate the Service and authenticate you</li>
            <li>To enforce rate limits based on your plan</li>
            <li>To display usage analytics on your personal dashboard</li>
            <li>To improve model quality (aggregated, non-identifiable patterns only)</li>
            <li>To contact you about your account or important Service changes</li>
          </ul>

          <h2>What we don&apos;t do</h2>
          <ul>
            <li>We do not sell your data to third parties</li>
            <li>We do not use your queries as training data for future model versions without explicit consent</li>
            <li>We do not share individual query content with advertisers</li>
          </ul>

          <h2>Third-party services</h2>
          <p>AgnosLogic uses the following third-party services:</p>
          <ul>
            <li><strong>Google OAuth</strong> — for sign-in authentication</li>
            <li><strong>RunPod</strong> — for model inference (inputs are transmitted to RunPod servers for processing; not stored long-term)</li>
            <li><strong>Vercel</strong> — for application hosting and Postgres database</li>
          </ul>

          <h2>Data retention</h2>
          <p>
            Query logs are retained for 90 days to support debugging and usage analytics. User account data is retained until you request deletion. Contact hello@agnoslogic.com to request deletion of your account and all associated data.
          </p>

          <h2>Security</h2>
          <p>
            API keys are stored in our database. OAuth tokens are not stored. All traffic is encrypted via HTTPS. We follow industry-standard security practices but cannot guarantee absolute security.
          </p>

          <h2>Your rights</h2>
          <p>
            Under GDPR and similar regulations, you have the right to: access your data, request correction, request deletion, and export your data. Contact hello@agnoslogic.com for any of these requests.
          </p>

          <h2>Contact</h2>
          <p>Questions about this policy? Email <a href="mailto:hello@agnoslogic.com">hello@agnoslogic.com</a>.</p>
        </div>
      </section>
    </>
  )
}
