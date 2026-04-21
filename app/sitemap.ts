import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.agnoslogic.com'
  const now = new Date()
  const pages = ['', '/test', '/benchmarks', '/docs', '/compare', '/use-cases', '/changelog', '/privacy', '/terms']
  return pages.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: p === '' ? 'weekly' : 'monthly',
    priority: p === '' ? 1.0 : p === '/test' || p === '/docs' ? 0.9 : 0.7,
  }))
}
