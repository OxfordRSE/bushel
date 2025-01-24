// app/auth/callback/route.ts
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import {FIGSHARE_API_BASE} from "@/lib/config";

const FIGSHARE_TOKEN_URL = `${FIGSHARE_API_BASE}/token`;
const CLIENT_ID = process.env.FIGSHARE_CLIENT_ID!;
const CLIENT_SECRET = process.env.FIGSHARE_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.APP_URL}/auth/callback`;

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
        return new Response('No code provided', { status: 400 });
    }

    try {
        // Exchange code for token
        const tokenResponse = await fetch(FIGSHARE_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
            }),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            throw new Error(`FigShare token exchange failed: ${error}`);
        }

        const tokens = await tokenResponse.json();
        const { access_token } = tokens;

        // Redirect back to the app
        return Response.redirect(new URL(`/?access_token=${access_token}`, request.url));
    } catch (error) {
        console.error('OAuth callback error:', error);
        return new Response('Authentication failed', { status: 500 });
    }
}