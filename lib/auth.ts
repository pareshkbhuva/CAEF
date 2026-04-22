import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { upsertUser, getUserByEmail, genApiKey } from './db'

export const authOptions: NextAuthOptions = {
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
        // Still allow sign-in even if database fails
        return true
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
            // Fallback when no database
            token.userId = 0
            token.apiKey = genApiKey(user.email)
            token.plan = 'free'
          }
        } catch {
          // Fallback when database fails
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
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const admins = (process.env.ADMIN_EMAILS || 'pareshbhuva@agnoslogic.com,hello@agnoslogic.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
  return admins.includes(email.toLowerCase())
}
