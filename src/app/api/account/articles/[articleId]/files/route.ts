import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {initMocks} from '@/mocks/init-mocks';

initMocks();

/**
 * Proxy endpoint for Figshare's /v2/account/articles/:articleId/files
 * 
 * Handles file operations (list files, initiate upload).
 * Authorization headers trigger CORS preflight which Figshare doesn't
 * properly support. Therefore, we proxy through our backend.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const token = (await cookies()).get('figshare_token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { articleId } = await params;

  // Make the request to Figshare API with Authorization header
  const res = await fetch(`https://api.figshare.com/v2/account/articles/${articleId}/files`, {
    headers: { 
      Authorization: `token ${token}`,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    console.error('Figshare API error:', errorBody);
    return NextResponse.json(errorBody, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const token = (await cookies()).get('figshare_token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { articleId } = await params;
  const body = await request.json();

  // Make the request to Figshare API with Authorization header
  const res = await fetch(`https://api.figshare.com/v2/account/articles/${articleId}/files`, {
    method: 'POST',
    headers: { 
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    console.error('Figshare API error:', errorBody);
    return NextResponse.json(errorBody, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
