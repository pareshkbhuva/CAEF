import { NextRequest, NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Fix NEXTAUTH_URL before importing NextAuth
function fixNextAuthUrl(req: NextRequest) {
  const envUrl = process.env.NEXTAUTH_URL || ''
  
  // Check if the env URL is valid (doesn't contain brackets or is empty)
  if (!envUrl || envUrl.includes('[') || envUrl.includes(']')) {
    // Get URL from request headers
    const host = req.headers.get('host') || req.headers.get('x-forwarded-host')
    const protocol = req.headers.get('x-forwarded-proto') || 'https'
    
    if (host) {
      process.env.NEXTAUTH_URL = `${protocol}://${host}`
    } else {
      // Fallback for local development
      process.env.NEXTAUTH_URL = 'http://localhost:3000'
    }
  }
}

const handler = async (req: NextRequest, context: { params: { nextauth: string[] } }) => {
  // Fix the URL before processing
  fixNextAuthUrl(req)
  
  try {
    const nextAuthHandler = NextAuth(authOptions)
    return await nextAuthHandler(req, context)
  } catch (error) {
    console.error('[v0] NextAuth error:', error)
    return NextResponse.json(
      { error: 'Authentication error' },
      { status: 500 }
    )
  }
}

export { handler as GET, handler as POST }
