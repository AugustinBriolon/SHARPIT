import type { NextRequest } from 'next/server';
import { addCustomFood, searchFoods } from '../service-handlers';

export const GET = (request: NextRequest) => searchFoods(request);
export const POST = (request: NextRequest) => addCustomFood(request);
