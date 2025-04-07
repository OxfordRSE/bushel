import { NextRequest, NextResponse } from 'next/server';
import {initMocks} from '@/mocks/init-mocks';

initMocks();

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const redirectUri = `${req.nextUrl.origin}/api/auth/callback`;

  const res = await fetch('https://figshare.com/account/applications/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.FIGSHARE_CLIENT_ID!,
      client_secret: process.env.FIGSHARE_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    return NextResponse.redirect(new URL('/?error=oauth', req.url));
  }

  const tokens = await res.json();
  const response = NextResponse.redirect(new URL('/', req.url)); // or app/page.tsx
  response.cookies.set('figshare_token', tokens.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  });
  response.cookies.set('figshare_token-refresh', tokens.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  });

  return response;
}
