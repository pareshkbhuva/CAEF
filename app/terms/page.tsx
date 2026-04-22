import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
}

export default function TermsPage() {
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
          <h1>Terms of Service</h1>
          <div className="meta-bar">Last updated: April 19, 2026</div>

          <p>
            By accessing or using AgnosLogic (the &quot;Service&quot;) operated by Agnos Logic, you agree to these Terms of Service. If you do not agree, do not use the Service.
          </p>

          <h2>Use of the Service</h2>
          <p>You may use AgnosLogic for lawful purposes only. You agree not to:</p>
          <ul>
            <li>Reverse engineer, decompile, or attempt to extract model weights</li>
            <li>Use the Service to generate or evaluate content that violates applicable laws</li>
            <li>Share or resell your API key</li>
            <li>Exceed rate limits through automated workarounds</li>
            <li>Use the Service to build a directly competing product</li>
          </ul>

          <h2>Accuracy disclaimer</h2>
          <p>
            AgnosLogic provides probabilistic verdicts based on machine learning models.{' '}
            <strong>No hallucination detector is 100% accurate.</strong> You should not rely solely on AgnosLogic verdicts for life-critical, medical, legal, or financial decisions without independent verification.
          </p>
          <p>
            Our best-performing model detects approximately 99% of labeled hallucinations on public benchmarks, but real-world performance varies with input distribution, domain, and model specifics. False positives and false negatives are inevitable.
          </p>

          <h2>API keys and account security</h2>
          <p>
            You are responsible for keeping your API key confidential. Any activity under your API key is attributed to you, including overage charges if applicable. Notify us immediately at hello@agnoslogic.com if you suspect unauthorized use.
          </p>

          <h2>Rate limits and pricing</h2>
          <p>
            Plans and their rate limits are listed on the pricing page. We may update plan pricing with 30 days notice via email.
          </p>

          <h2>Service availability</h2>
          <p>
            We strive for high availability but do not guarantee uninterrupted service. Enterprise customers receive an SLA covering specific uptime and response time commitments.
          </p>

          <h2>Intellectual property</h2>
          <p>
            AgnosLogic, its architecture (CAEF), and all related technology are owned by Agnos Logic and protected by a US Provisional Patent filed March 23, 2026. You retain ownership of content you submit to the Service.
          </p>

          <h2>Liability</h2>
          <p>
            To the fullest extent permitted by law, Agnos Logic is not liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability for any claim shall not exceed the fees you paid in the 12 months preceding the claim.
          </p>

          <h2>Termination</h2>
          <p>
            We may suspend or terminate your access for violations of these Terms. You may cancel your account at any time by emailing hello@agnoslogic.com.
          </p>

          <h2>Changes</h2>
          <p>We may update these Terms. Material changes will be communicated via email.</p>

          <h2>Contact</h2>
          <p>Questions? Email <a href="mailto:hello@agnoslogic.com">hello@agnoslogic.com</a>.</p>
        </div>
      </section>
    </>
  )
}
