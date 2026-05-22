import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {initMocks} from '@/mocks/init-mocks';
import {
  figshareErrorResponse,
  figshareJsonResponse,
  parseFigshareResponse,
} from '@/lib/figshare-proxy-response';

initMocks();

/**
 * Proxy endpoint for Figshare's /v2/account/articles/:articleId/files
 * 
 * Handles file operations (list files, initiate upload).
 * Authorization headers trigger CORS preflight which Figshare doesn't
 * properly support. Therefore, we proxy through our backend.
 */
export async function GET(
  _request: NextRequest,
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
      Accept: 'application/json',
      Authorization: `token ${token}`,
    },
  });

  if (!res.ok) {
    return figshareErrorResponse(res, 'list article files');
  }

  const parsed = await parseFigshareResponse(res, 'list article files');

  if (parsed.json === null) {
    return NextResponse.json(
      {
        contentType: parsed.contentType || null,
        detail: parsed.text.slice(0, 2000) || null,
        message: 'Figshare returned a non-JSON file list response',
      },
      { status: 502 },
    );
  }

  return figshareJsonResponse(res, parsed);
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
      Accept: 'application/json',
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return figshareErrorResponse(res, 'create article file');
  }

  const parsed = await parseFigshareResponse(res, 'create article file');

  if (parsed.json === null || typeof parsed.json !== 'object' || parsed.json === null) {
    return NextResponse.json(
      {
        contentType: parsed.contentType || null,
        detail: parsed.text.slice(0, 2000) || null,
        message: 'Figshare returned a non-JSON file creation response',
      },
      { status: 502 },
    );
  }

  const data = parsed.json as Record<string, unknown>;

  // Keep the upload flow on our own origin so the client never follows
  // Figshare file URLs directly.
  if (data.location && typeof data.location === 'string') {
    try {
      const locationUrl = new URL(data.location);
      data.location = locationUrl.pathname.replace(/^\/v2/, '/api');
    } catch {
      // Leave the original value untouched if Figshare changes the shape.
    }
  }

  return NextResponse.json(data);
}
