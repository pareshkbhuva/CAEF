import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  
  pages: {
    signIn: '/',
    error: '/',
  },
  
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      if (account) {
        token.provider = account.provider
      }
      return token
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (typeof token.id === 'number' ? token.id : parseInt(token.id as string, 10) || 0)
      }
      return session
    },
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }

// Handle HEAD requests
export async function HEAD(req: any) {
  return new Response(null, { status: 200 })
}
