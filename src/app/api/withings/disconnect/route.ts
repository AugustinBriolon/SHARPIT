import { NextResponse } from 'next/server';
import { disconnectWithings } from '@/lib/integrations/withings-sync';

export async function POST() {
  await disconnectWithings();
  return NextResponse.json({ ok: true });
}
