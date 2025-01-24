// src/app/api/figshare_api_mock/token/route.ts
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { grant_type, code, client_id, client_secret, redirect_uri } = body;

        // Validate required fields
        if (!grant_type || !code || !client_id || !client_secret || !redirect_uri) {
            return new Response(JSON.stringify({
                error: 'invalid_request',
                error_description: 'Missing required parameters'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        }

        // Mock successful token response
        const mockTokenResponse = {
            access_token: 'mock_access_token_' + Date.now(),
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock_refresh_token_' + Date.now(),
            scope: 'all'
        };

        return new Response(JSON.stringify(mockTokenResponse), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            }
        });

    } catch (error) {
        console.error('Mock token exchange error:', error);
        return new Response(JSON.stringify({
            error: 'server_error',
            error_description: 'An error occurred processing the request'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            }
        });
    }
}