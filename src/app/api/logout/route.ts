import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const c = await cookies();
  c.set('figshare_token', '', { path: '/', maxAge: 0 });
  c.set('figshare_token-refresh', '', { path: '/', maxAge: 0 });

  return new NextResponse(null, { status: 204 });
}
