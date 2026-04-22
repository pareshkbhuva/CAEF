import { NextRequest } from 'next/server'
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { upsertUser, getUserByEmail, genApiKey } from '@/lib/db'

// Fix NEXTAUTH_URL at module load time if it contains invalid characters
const originalUrl = process.env.NEXTAUTH_URL || ''
if (originalUrl.includes('[') || originalUrl.includes(']') || !originalUrl) {
  // Set a valid default that works for both development and production
  // In production on Vercel, we'll use VERCEL_URL if available
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    process.env.NEXTAUTH_URL = `https://${vercelUrl}`
  } else {
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  }
  console.log('[v0] Fixed NEXTAUTH_URL at module load:', process.env.NEXTAUTH_URL)
}

const authOptions = {
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
    strategy: 'jwt' as const,
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
        return true // Allow sign-in even if DB fails
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
}

const handler = NextAuth(authOptions)

// Use a wrapper to dynamically update NEXTAUTH_URL from request headers
async function wrappedHandler(req: NextRequest, context: any) {
  // Update NEXTAUTH_URL based on actual request host for proper redirects
  const host = req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  if (host) {
    process.env.NEXTAUTH_URL = `${proto}://${host}`
  }
  return handler(req, context)
}

export { wrappedHandler as GET, wrappedHandler as POST }
