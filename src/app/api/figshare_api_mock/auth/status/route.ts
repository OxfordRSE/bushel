// app/api/mock/auth/status/route.ts
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    // Mock authenticated state
    return new Response(JSON.stringify({
        status: 'Authenticated'
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}