import type { NextRequest } from 'next/server';
import { putTargets } from '../service-handlers';

export const PUT = (request: NextRequest) => putTargets(request);
