import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {initMocks} from '@/mocks/init-mocks';
import {
  figshareErrorResponse,
  figshareJsonResponse,
  figshareTextResponse,
  logFigshareResponse,
  parseFigshareResponse,
} from '@/lib/figshare-proxy-response';

initMocks();

/**
 * Proxy endpoint for Figshare's /v2/account/articles/:articleId/files/:fileId
 * 
 * Handles file completion and other file-specific operations.
 * Authorization headers trigger CORS preflight which Figshare doesn't
 * properly support. Therefore, we proxy through our backend.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ articleId: string; fileId: string }> }
) {
  const token = (await cookies()).get('figshare_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { articleId, fileId } = await params;

  const res = await fetch(
    `https://api.figshare.com/v2/account/articles/${articleId}/files/${fileId}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `token ${token}`,
      },
    }
  );

  if (!res.ok) {
    return figshareErrorResponse(res, 'get article file');
  }

  const parsed = await parseFigshareResponse(res, 'get article file');

  if (parsed.json === null || typeof parsed.json !== 'object') {
    return NextResponse.json(
      {
        contentType: parsed.contentType || null,
        detail: parsed.text.slice(0, 2000) || null,
        message: 'Figshare returned a non-JSON file detail response',
      },
      { status: 502 },
    );
  }

  const data = parsed.json as Record<string, unknown>;

  if (data.upload_url && typeof data.upload_url === 'string') {
    try {
      const uploadUrl = new URL(data.upload_url);
      data.upload_url = `/api/upload/${uploadUrl.host}${uploadUrl.pathname}`;
    } catch {
      // Leave the original value untouched if Figshare changes the shape.
    }
  }

  return figshareJsonResponse(res, { ...parsed, json: data });
}

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
        Accept: 'application/json',
        Authorization: `token ${token}`,
      },
      redirect: 'manual',
    }
  );

  if (!res.ok) {
    return figshareErrorResponse(res, 'complete article file upload');
  }

  const parsed = await parseFigshareResponse(res, 'complete article file upload');

  if (parsed.json !== null) {
    return figshareJsonResponse(res, parsed);
  }

  if (parsed.text) {
    logFigshareResponse('complete article file upload success body', res, parsed.text);
    return figshareTextResponse(res, parsed);
  }

  return new NextResponse(null, { status: res.status });
}
