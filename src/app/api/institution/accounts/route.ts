import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {initMocks} from '@/mocks/init-mocks';

initMocks();

/**
 * Proxy endpoint for Figshare's /v2/account/institution/accounts
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

  // First, verify the user's account info to check institution_id
  const accountRes = await fetch('https://api.figshare.com/v2/account', {
    headers: { Authorization: `token ${token}` },
  });
  
  if (!accountRes.ok) {
    console.error('Failed to fetch account info:', await accountRes.text());
    return NextResponse.json({ error: 'Failed to fetch account info' }, { status: 500 });
  }
  
  const accountInfo = await accountRes.json();
  console.log('Account institution_id:', accountInfo.institution_id);
  
  if (!accountInfo.institution_id) {
    return NextResponse.json({ 
      error: 'Account does not belong to an institution',
      debug: {
        message: 'You need to log in via your institution\'s Figshare portal (e.g., institution.figshare.com), not the main figshare.com site.',
        account_id: accountInfo.id,
        email: accountInfo.email,
        institution_id: accountInfo.institution_id
      }
    }, { status: 403 });
  }

  // Get query parameters from the request URL
  const { searchParams } = request.nextUrl;
  
  // Build the Figshare API URL with query parameters
  const figshareUrl = new URL('https://api.figshare.com/v2/account/institution/accounts');
  
  // Forward all query parameters (page_size, page, email, etc.)
  searchParams.forEach((value, key) => {
    figshareUrl.searchParams.set(key, value);
  });

  // Make the request to Figshare API with Authorization header
  // (institutional admin endpoints require this, not just query param)
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
