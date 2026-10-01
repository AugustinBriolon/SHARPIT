import type { NextRequest } from 'next/server';
import { editCustomFood, removeCustomFood } from '../../service-handlers';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  return editCustomFood(request, (await context.params).id);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  return removeCustomFood((await context.params).id);
}
