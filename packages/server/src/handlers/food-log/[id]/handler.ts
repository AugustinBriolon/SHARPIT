import type { NextRequest } from 'next/server';
import { deleteEntry, updateEntry } from '../service-handlers';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateEntry(request, (await context.params).id);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  return deleteEntry((await context.params).id);
}
