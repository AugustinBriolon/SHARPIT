/**
 * Capture Science Sport copy V0 design PNGs from the Vercel preview (demo mode).
 * - today_mobile_disclaimer.png — mobile 390×844, hero + secondary disclaimer, verdict above fold
 * - recovery_alert_disclaimer.png — recovery page with illness alert (API patched) + disclaimer
 */
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const SHARE = process.env.SHARPIT_SHARE_URL;
const ORIGIN = process.env.SHARPIT_ORIGIN;

if (!SHARE || !ORIGIN) {
  console.error('Set SHARPIT_SHARE_URL and SHARPIT_ORIGIN');
  process.exit(1);
}

const OUT_DIRS = [
  path.resolve('/workspace/docs/design/science-sport-copy-v0'),
  path.resolve('/opt/cursor/artifacts'),
];

async function savePng(buffer, name) {
  for (const dir of OUT_DIRS) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), buffer);
  }
}

async function dismissCriticalBanner(page) {
  const later = page.getByRole('button', { name: /Plus tard/i });
  if (await later.count()) {
    await later.first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
}

async function waitForHero(page) {
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(800);
}

async function enterDemo(page) {
  await page.goto(SHARE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1500);
  await page.goto(`${ORIGIN}/demo`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(1000);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const mobile = devices['iPhone 12'];
  const context = await browser.newContext({
    ...mobile,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'fr-FR',
  });

  // Patch recovery presentation so the real RecoveryAlertsSection mounts with illness.
  await context.route('**/api/presentation/recovery**', async (route) => {
    const response = await route.fetch();
    const json = await response.json().catch(() => null);
    if (json?.viewModel) {
      json.viewModel.illness = {
        label: 'Risque élevé',
        colorClass: 'text-signal-risk',
      };
      json.viewModel.dissonanceDetected = false;
    }
    await route.fulfill({
      status: response.status(),
      contentType: 'application/json',
      body: JSON.stringify(json ?? {}),
    });
  });

  const page = await context.newPage();

  await enterDemo(page);
  await page.goto(`${ORIGIN}/`, { waitUntil: 'load', timeout: 120000 });
  await waitForHero(page);
  await dismissCriticalBanner(page);

  await page.locator('details').evaluateAll((nodes) => {
    for (const el of nodes) {
      if (/Briefing|Lire le briefing/i.test(el.textContent || '')) {
        el.open = false;
      }
    }
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  const disclaimer = page.getByText(/outil d['’]aide à l['’]entraînement/i).first();
  await disclaimer.waitFor({ timeout: 15000 });

  // Confirm verdict heading still in viewport (above fold).
  const heroBox = await page.getByRole('heading', { level: 1 }).boundingBox();
  if (!heroBox || heroBox.y > 500) {
    throw new Error(`Verdict heading not above fold: y=${heroBox?.y}`);
  }

  await savePng(
    await page.screenshot({ type: 'png', fullPage: false }),
    'today_mobile_disclaimer.png',
  );

  await page.goto(`${ORIGIN}/today/recovery`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(1500);
  await dismissCriticalBanner(page);

  const atypical = page.getByText(/Signal de récupération atypique/i).first();
  await atypical.waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);

  // Frame alert + full secondary disclaimer above the bottom nav.
  await page.evaluate(() => {
    const alert = Array.from(document.querySelectorAll('*')).find((n) =>
      /Signal de récupération atypique/i.test(n.textContent || ''),
    );
    if (!alert) return;
    const y = alert.getBoundingClientRect().top + window.scrollY - 40;
    window.scrollTo(0, Math.max(0, y));
  });
  await page.waitForTimeout(300);

  await page.getByText(/En cas de symptômes/i).first().waitFor({ timeout: 10000 });
  const disc = page.getByText(/pas un diagnostic/i).first();
  await disc.waitFor({ timeout: 10000 });
  await disc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  // Nudge up so both alert and full disclaimer clear the bottom nav (~80px).
  await page.evaluate(() => {
    window.scrollBy(0, -120);
  });
  await page.waitForTimeout(200);
  await savePng(
    await page.screenshot({ type: 'png', fullPage: false }),
    'recovery_alert_disclaimer.png',
  );

  await context.close();
  await browser.close();

  for (const dir of OUT_DIRS) {
    for (const name of ['today_mobile_disclaimer.png', 'recovery_alert_disclaimer.png']) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      console.log(`${p} ${st.size} bytes`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
