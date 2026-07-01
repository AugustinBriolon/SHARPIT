import { NextResponse } from 'next/server';
import { disconnectRenpho } from '@/lib/renpho-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  await disconnectRenpho();
  return NextResponse.json({ success: true });
}
