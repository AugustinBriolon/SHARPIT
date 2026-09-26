import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PROXY = path.join(process.cwd(), 'src/proxy.ts');

describe('proxy public teaser entry', () => {
  const source = fs.readFileSync(PROXY, 'utf8');

  it('lists /welcome as a Clerk public route', () => {
    expect(source).toContain("'/welcome(.*)'");
  });

  it('redirects signed-out GET / to /welcome before auth.protect', () => {
    expect(source).toContain("pathname === '/'");
    expect(source).toContain("welcome.pathname = '/welcome'");
    expect(source).toContain('NextResponse.redirect(welcome)');
  });
});
