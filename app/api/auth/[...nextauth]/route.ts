import { NextRequest, NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { upsertUser, getUserByEmail, genApiKey } from '@/lib/db'

// Create NextAuth handler with dynamic NEXTAUTH_URL
function createAuthHandler(baseUrl: string) {
  return NextAuth({
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
      async signIn({ user, account }: any) {
        if (!user?.email || account?.provider !== 'google') return false
        try {
          await upsertUser({
            email: user.email,
            name: user.name || '',
            picture: user.image || '',
            googleId: account.providerAccountId,
          })
          return true
        } catch (err) {
          console.error('[v0] signIn upsertUser failed:', err)
          return true
        }
      },
      async jwt({ token, user }: any) {
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
      async session({ session, token }: any) {
        if (session?.user) {
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
    secret: process.env.NEXTAUTH_SECRET,
    trustHost: true,
  })
}

// Middleware to fix NEXTAUTH_URL before processing
function middleware(req: NextRequest) {
  const configuredUrl = process.env.NEXTAUTH_URL || ''
  
  // Only fix if the configured URL contains brackets (invalid)
  if (configuredUrl.includes('[')) {
    const host = req.headers.get('host') || 'localhost:3000'
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${proto}://${host}`
    process.env.NEXTAUTH_URL = baseUrl
    console.log('[v0] Fixed NEXTAUTH_URL to:', baseUrl)
  }
}

export async function GET(req: NextRequest, context: any) {
  middleware(req)
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const handler = createAuthHandler(baseUrl)
  return handler(req, context)
}

export async function POST(req: NextRequest, context: any) {
  middleware(req)
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const handler = createAuthHandler(baseUrl)
  return handler(req, context)
}
