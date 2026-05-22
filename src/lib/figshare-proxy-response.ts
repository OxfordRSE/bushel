import { NextResponse } from 'next/server';

type ParsedFigshareResponse = {
  contentType: string;
  json: unknown | null;
  text: string;
};

export async function parseFigshareResponse(
  response: Response,
  context: string,
): Promise<ParsedFigshareResponse> {
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();

  if (!text) {
    return { contentType, json: null, text };
  }

  const looksLikeJson =
    contentType.toLowerCase().includes('application/json') ||
    /^[\s]*[{[]/.test(text);

  if (!looksLikeJson) {
    return { contentType, json: null, text };
  }

  try {
    return {
      contentType,
      json: JSON.parse(text),
      text,
    };
  } catch (error) {
    logFigshareResponse(context, response, text, error);
    return { contentType, json: null, text };
  }
}

export async function figshareErrorResponse(
  response: Response,
  context: string,
) {
  const parsed = await parseFigshareResponse(response, context);

  if (parsed.json !== null) {
    console.error(`[${context}] Figshare API error`, parsed.json);
    return NextResponse.json(parsed.json, { status: response.status });
  }

  logFigshareResponse(context, response, parsed.text);
  return NextResponse.json(
    {
      contentType: parsed.contentType || null,
      detail: parsed.text.slice(0, 2000) || null,
      message: response.statusText || 'Unexpected Figshare error',
    },
    { status: response.status },
  );
}

export function figshareJsonResponse(
  response: Response,
  parsed: ParsedFigshareResponse,
) {
  return NextResponse.json(parsed.json, { status: response.status });
}

export function figshareTextResponse(
  response: Response,
  parsed: ParsedFigshareResponse,
) {
  const headers = new Headers();

  if (parsed.contentType) {
    headers.set('Content-Type', parsed.contentType);
  }

  return new NextResponse(parsed.text || null, {
    headers,
    status: response.status,
  });
}

export function logFigshareResponse(
  context: string,
  response: Response,
  bodyText: string,
  error?: unknown,
) {
  console.error(`[${context}] Unexpected Figshare response`, {
    bodySnippet: bodyText.slice(0, 500),
    contentType: response.headers.get('content-type'),
    location: response.headers.get('location'),
    redirected: response.redirected,
    status: response.status,
    statusText: response.statusText,
    url: response.url,
  }, error);
}
