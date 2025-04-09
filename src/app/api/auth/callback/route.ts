import { NextRequest, NextResponse } from 'next/server';
import {initMocks} from '@/mocks/init-mocks';
import {absoluteUrl} from "@/lib/utils";

initMocks();

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const redirectUri = absoluteUrl(req, "/api/auth/callback");

  const res = await fetch('https://api.figshare.com/v2/token', {
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

  if (!res.ok || (process.env.NODE_ENV === "development" && process.env.MOCK_LOGIN_OAUTH_FAIL?.toLowerCase() === 'true')) {
    console.error("OAuth failed", JSON.stringify(await res.json()));
    return NextResponse.redirect(absoluteUrl(req, '/?error=oauth'));
  }

  const tokens = await res.json();
  // console.debug("OAuth succeeded", JSON.stringify(Object.fromEntries(Object.entries(tokens).map(([key, value]) => [key, value instanceof String? `${ value?.substring(0, 3)}...` : 'non-string value']))));
  const response = NextResponse.redirect(absoluteUrl(req, '/')); // or app/page.tsx
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
