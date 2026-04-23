import './globals.css'
import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { SessionProvider } from '@/components/SessionProvider'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.agnoslogic.com'),
  title: {
    default: 'AgnosLogic — AI Hallucination Detection API',
    template: '%s — AgnosLogic',
  },
  description:
    'AgnosLogic detects LLM hallucinations by reading hidden state geometry — no judge LLM, no RAG, no extra inference calls. Single API call, sub-second latency.',
  keywords: [
    'AI hallucination detection',
    'LLM uncertainty',
    'hallucination API',
    'AI risk scoring',
    'epistemic uncertainty',
    'LLM evaluation',
  ],
  authors: [{ name: 'Agnos Logic' }],
  openGraph: {
    title: 'AgnosLogic — AI Hallucination Detection',
    description:
      'Single-forward-pass hallucination detection for LLMs. Reads hidden state geometry directly. No judge LLM required.',
    url: 'https://www.agnoslogic.com',
    siteName: 'AgnosLogic',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgnosLogic — AI Hallucination Detection',
    description: 'Single-forward-pass hallucination detection for LLMs.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionProvider>
          <Nav />
          <main>{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  )
}
