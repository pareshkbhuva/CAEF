import { NextRequest, NextResponse } from 'next/server'

// NextAuth is temporarily disabled due to invalid NEXTAUTH_URL configuration
// To enable: Update NEXTAUTH_URL to a valid URL in your environment variables (e.g., https://your-app.vercel.app)

export async function GET(req: NextRequest, { params }: { params: { nextauth: string[] } }) {
  const [action] = params.nextauth
  
  if (action === 'signin') {
    return new NextResponse(
      `<html><body><h1>Sign In</h1><p>Authentication is not configured. Please contact support.</p></body></html>`,
      { status: 200, headers: { 'content-type': 'text/html' } }
    )
  }
  
  return NextResponse.json({ message: 'NextAuth endpoint (auth disabled)' }, { status: 200 })
}

export async function POST(req: NextRequest, { params }: { params: { nextauth: string[] } }) {
  return NextResponse.json({ message: 'NextAuth endpoint (auth disabled)' }, { status: 200 })
}
