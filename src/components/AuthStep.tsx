// components/AuthStep.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { FIGSHARE_AUTH_URL, useApiMocks } from "@/lib/config";

const CLIENT_ID = process.env.NEXT_PUBLIC_FIGSHARE_CLIENT_ID;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;

export function AuthStep() {
    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = () => {
        setIsLoading(true);

        if (useApiMocks) {
            window.location.href = `/auth/callback?code=mock_code`;
            return;
        }

        const params = new URLSearchParams({
            client_id: CLIENT_ID!,
            response_type: 'code',
            redirect_uri: REDIRECT_URI,
            scope: 'all'
        });

        window.location.href = `${FIGSHARE_AUTH_URL}?${params.toString()}`;
    };

    return (
        <div>
            <p className="mb-4">Connect your FigShare account to get started with the integration.</p>
            <Button
                onClick={handleSignIn}
                disabled={isLoading}
            >
                <LogIn className="w-4 h-4 mr-2" />
                {isLoading ? 'Connecting...' : 'Sign in with FigShare'}
            </Button>
        </div>
    );
}