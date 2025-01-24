// lib/figshare.ts

export class FigShareClient {
    private token: string;
    private baseUrl: string;

    constructor(token: string, baseUrl: string) {
        this.token = token;
        this.baseUrl = baseUrl;
    }

    async request(endpoint: string, options: RequestInit = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `token ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`FigShare API error: ${response.statusText}`);
        }

        return response.json();
    }
}