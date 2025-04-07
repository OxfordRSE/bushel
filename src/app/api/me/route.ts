import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {initMocks} from '@/mocks/init-mocks';

initMocks();

export async function GET() {
  const token = (await cookies()).get('figshare_token')!.value;

  const res = await fetch('https://api.figshare.com/v2/account', {
    headers: { Authorization: `token ${token}` },
  });

  if (!res.ok) return NextResponse.json(await res.json(), { status: res.status });

  const user = await res.json();
  return NextResponse.json({ token, user });
}
