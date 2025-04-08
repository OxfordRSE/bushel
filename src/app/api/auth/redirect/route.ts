import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        const redirectUrl = new URL(`${req.nextUrl.origin}/api/auth/callback`);
        const code = process.env.MOCK_LOGIN_CODE ?? 'mock-code';
        redirectUrl.searchParams.set('code', code);
        return NextResponse.json({ url: redirectUrl.toString() });
    }

    const clientId = process.env.NEXT_PUBLIC_FIGSHARE_CLIENT_ID ?? process.env.FIGSHARE_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({ error: 'Missing client ID' }, { status: 500 });
    }

    const proto = req.headers.get('x-forwarded-proto') ?? 'https';
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    const redirectUri = `${proto}://${host}/api/auth/callback`;

    const url = new URL('https://figshare.com/account/applications/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);

    return NextResponse.json({ url: url.toString() });
}
