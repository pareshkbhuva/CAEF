import { NextRequest, NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { upsertUser, getUserByEmail, genApiKey } from '@/lib/db'

// Check if NEXTAUTH_URL is valid, fix it if needed
function getValidNextAuthUrl(req: NextRequest): string {
  const configuredUrl = process.env.NEXTAUTH_URL || ''
  
  // If URL is valid, use it
  try {
    if (configuredUrl && !configuredUrl.includes('[')) {
      new URL(configuredUrl)
      return configuredUrl
    }
  } catch {}
  
  // Derive URL from request headers
  const host = req.headers.get('host') || 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  return `${proto}://${host}`
}

// Create auth handler dynamically with correct URL
function createAuthHandler(req: NextRequest) {
  const baseUrl = getValidNextAuthUrl(req)
  
  // Temporarily set NEXTAUTH_URL for this request
  process.env.NEXTAUTH_URL = baseUrl
  
  const handler = NextAuth({
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        authorization: {
          params: {
            prompt: 'select_account',
            access_type: 'online',
            response_type: 'code',
          },
        },
      }),
    ],
    session: {
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
      async signIn({ user, account }) {
        if (!user.email || account?.provider !== 'google') return false
        try {
          await upsertUser({
            email: user.email,
            name: user.name || '',
            picture: user.image || '',
            googleId: account.providerAccountId,
          })
          return true
        } catch (err) {
          console.error('signIn upsertUser failed:', err)
          return true // Allow sign-in even if DB fails
        }
      },
      async jwt({ token, user }) {
        if (user?.email) {
          try {
            const dbUser = await getUserByEmail(user.email)
            if (dbUser) {
              token.userId = dbUser.id
              token.apiKey = dbUser.api_key
              token.plan = dbUser.plan
            } else {
              token.userId = 0
              token.apiKey = genApiKey(user.email)
              token.plan = 'free'
            }
          } catch {
            token.userId = 0
            token.apiKey = genApiKey(user.email)
            token.plan = 'free'
          }
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.userId as number
          session.user.apiKey = token.apiKey as string
          session.user.plan = token.plan as string
        }
        return session
      },
    },
    pages: {
      signIn: '/',
      error: '/',
    },
  })
  
  return handler
}

export async function GET(req: NextRequest, context: { params: { nextauth: string[] } }) {
  const handler = createAuthHandler(req)
  return handler(req, context)
}

export async function POST(req: NextRequest, context: { params: { nextauth: string[] } }) {
  const handler = createAuthHandler(req)
  return handler(req, context)
}
