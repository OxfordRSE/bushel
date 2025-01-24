// lib/config.ts
import {FigShareClient} from "@/lib/figshare";

export const FIGSHARE_API_BASE = process.env.NEXT_PUBLIC_MOCK_FIGSHARE_API === 'true'
    ? 'http://localhost:3000/api/figshare_api_mock'
    : 'https://api.figshare.com/v2';

export const FIGSHARE_AUTH_URL = process.env.NEXT_PUBLIC_MOCK_FIGSHARE_API === 'true'
    ? 'http://localhost:3000/api/figshare_api_mock/auth'
    : 'https://figshare.com/account/applications/authorize';

export const useApiMocks = process.env.NEXT_PUBLIC_MOCK_FIGSHARE_API === 'true';

export const getFigShareClient = (token: string) => {
    return new FigShareClient(token, FIGSHARE_API_BASE);
}