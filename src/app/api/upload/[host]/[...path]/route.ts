import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { initMocks } from '@/mocks/init-mocks';
import {
  figshareErrorResponse,
  figshareJsonResponse,
  parseFigshareResponse,
} from '@/lib/figshare-proxy-response';

initMocks();

function buildUploadUrl(host: string, path: string[]) {
  return `https://${host}/${path.join('/')}`;
}

/**
 * Proxy endpoint for Figshare's regional upload hosts.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ host: string; path: string[] }> },
) {
  const token = (await cookies()).get('figshare_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { host, path } = await params;
  const res = await fetch(buildUploadUrl(host, path), {
    headers: {
      Accept: 'application/json',
      Authorization: `token ${token}`,
    },
  });

  if (!res.ok) {
    return figshareErrorResponse(res, 'get upload parts');
  }

  const parsed = await parseFigshareResponse(res, 'get upload parts');

  if (parsed.json === null) {
    return NextResponse.json(
      {
        contentType: parsed.contentType || null,
        detail: parsed.text.slice(0, 2000) || null,
        message: 'Figshare returned a non-JSON upload parts response',
      },
      { status: 502 },
    );
  }

  return figshareJsonResponse(res, parsed);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ host: string; path: string[] }> },
) {
  const token = (await cookies()).get('figshare_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { host, path } = await params;
  const body = await request.arrayBuffer();
  const contentType = request.headers.get('content-type');

  const headers: Record<string, string> = {
    Authorization: `token ${token}`,
  };

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  const res = await fetch(buildUploadUrl(host, path), {
    method: 'PUT',
    headers,
    body,
  });

  if (!res.ok) {
    return figshareErrorResponse(res, 'upload file part');
  }

  return new NextResponse(null, { status: res.status });
}
