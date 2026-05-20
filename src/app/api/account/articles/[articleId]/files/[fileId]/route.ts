import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {initMocks} from '@/mocks/init-mocks';

initMocks();

/**
 * Proxy endpoint for Figshare's /v2/account/articles/:articleId/files/:fileId
 * 
 * Handles file completion and other file-specific operations.
 * Authorization headers trigger CORS preflight which Figshare doesn't
 * properly support. Therefore, we proxy through our backend.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string; fileId: string }> }
) {
  const token = (await cookies()).get('figshare_token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { articleId, fileId } = await params;

  // Make the request to Figshare API with Authorization header
  const res = await fetch(
    `https://api.figshare.com/v2/account/articles/${articleId}/files/${fileId}`,
    {
      method: 'POST',
      headers: { 
        Authorization: `token ${token}`,
      },
    }
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    console.error('Figshare API error:', errorBody);
    return NextResponse.json(errorBody, { status: res.status });
  }

  // This endpoint may return empty body
  const text = await res.text();
  if (text) {
    return NextResponse.json(JSON.parse(text));
  }
  return new NextResponse(null, { status: res.status });
}
