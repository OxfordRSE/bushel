import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_EXEMPT_PATHS = [
  '/api/auth/callback',
  '/api/auth/redirect',
  '/api/logout',
];

// Guard API routes against unauthenticated access
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isApiRoute = pathname.startsWith('/api/');
  const isExempt = AUTH_EXEMPT_PATHS.includes(pathname);

  if (isApiRoute && !isExempt) {
    const token = req.cookies.get('figshare_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
