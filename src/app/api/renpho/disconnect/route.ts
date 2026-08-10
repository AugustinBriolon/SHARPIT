import { NextResponse } from 'next/server';
import { disconnectRenpho } from '@/lib/integrations/renpho-sync';

export async function POST() {
  await disconnectRenpho();
  return NextResponse.json({ success: true });
}
