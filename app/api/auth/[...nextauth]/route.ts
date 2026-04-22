import { NextRequest, NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Helper to get a valid NEXTAUTH_URL from request
function getValidNextAuthUrl(req: NextRequest): string {
  const envUrl = process.env.NEXTAUTH_URL || ''
  
  // Check if the env URL is valid (doesn't contain brackets or is empty)
  if (envUrl && !envUrl.includes('[') && !envUrl.includes(']')) {
    try {
      new URL(envUrl)
      return envUrl
    } catch {
      // Invalid URL, fall through to header detection
    }
  }
  
  // Get URL from request headers
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host')
  const protocol = req.headers.get('x-forwarded-proto') || 'https'
  
  if (host) {
    return `${protocol}://${host}`
  }
  
  // Fallback for local development
  return 'http://localhost:3000'
}

// Create handler that fixes NEXTAUTH_URL before processing
async function handler(req: NextRequest, context: { params: { nextauth: string[] } }) {
  // Fix NEXTAUTH_URL at runtime before NextAuth processes the request
  const validUrl = getValidNextAuthUrl(req)
  process.env.NEXTAUTH_URL = validUrl
  
  const nextAuthHandler = NextAuth(authOptions)
  return nextAuthHandler(req, context)
}

export { handler as GET, handler as POST }
