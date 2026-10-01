import type { NextRequest } from 'next/server';
import { foodByBarcode } from '../../../service-handlers';

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  return foodByBarcode((await context.params).code);
}
