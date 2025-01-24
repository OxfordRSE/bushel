// app/api/mock/articles/route.ts
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    return new Response(JSON.stringify([
        {
            id: 1,
            title: "Mock Article 1",
            doi: "10.1234/mock.1",
            url: "http://localhost:3000/articles/1",
            published_date: "2024-01-24T00:00:00Z",
            authors: [
                {
                    id: 1,
                    full_name: "Test Author",
                    is_active: true
                }
            ]
        }
    ]), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}