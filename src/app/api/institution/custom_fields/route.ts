import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {initMocks} from '@/mocks/init-mocks';

initMocks();

/**
 * Proxy endpoint for Figshare's /v2/account/institution/custom_fields
 * 
 * This endpoint REQUIRES the Authorization header (not just query param),
 * but Authorization headers trigger CORS preflight which Figshare doesn't
 * properly support. Therefore, we proxy through our backend.
 */
export async function GET(request: NextRequest) {
  const token = (await cookies()).get('figshare_token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get query parameters from the request URL
  const { searchParams } = request.nextUrl;
  
  // Build the Figshare API URL with query parameters
  const figshareUrl = new URL('https://api.figshare.com/v2/account/institution/custom_fields');
  
  // Forward all query parameters (group_id, etc.)
  searchParams.forEach((value, key) => {
    figshareUrl.searchParams.set(key, value);
  });

  // Make the request to Figshare API with Authorization header
  const res = await fetch(figshareUrl.toString(), {
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
