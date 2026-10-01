import type { NextRequest } from 'next/server';
import { addEntry, getDay } from './service-handlers';

export const GET = (request: NextRequest) => getDay(request);
export const POST = (request: NextRequest) => addEntry(request);
