import { cookies } from 'next/headers';

export async function getFigshareAccessToken(): Promise<string | null> {
  const c = await cookies();
  const token = c.get('figshare_token')?.value;
  const refresh = c.get('figshare_token-refresh')?.value;

  // Check if access token is missing or should be refreshed
  const needsRefresh = !token; // add expiration logic if desired

  if (needsRefresh && refresh) {
    const newToken = await refreshAccessToken(refresh);
    if (newToken) {
      c.set('figshare_token', newToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 3600,
      });
      return newToken;
    }
  }

  return token ?? null;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://figshare.com/account/applications/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.FIGSHARE_CLIENT_ID!,
      client_secret: process.env.FIGSHARE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) return null;

  const { access_token } = await res.json();
  return access_token;
}
