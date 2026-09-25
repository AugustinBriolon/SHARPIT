/**
 * Capture mobile viewport showing Comprendre mini signal cards below bilan.
 */
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const SHARE =
  'https://sharpit-git-cursor-today-comp-f3b388-augustin-briolons-projects.vercel.app/?_vercel_share=19d7I2vL1PwSVDeOx00hfTSAcUAJazcX';
const ORIGIN = 'https://sharpit-git-cursor-today-comp-f3b388-augustin-briolons-projects.vercel.app';

const OUT = [
  path.resolve('/workspace/docs/design/today-v0'),
  path.resolve('/opt/cursor/artifacts'),
];

async function save(buf, name) {
  for (const dir of OUT) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), buf);
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices['iPhone 12'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'fr-FR',
});
const page = await context.newPage();
await page.goto(SHARE, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.goto(`${ORIGIN}/demo`, { waitUntil: 'networkidle', timeout: 90000 });
await page.goto(`${ORIGIN}/`, { waitUntil: 'networkidle', timeout: 90000 });
await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 60000 });

const later = page.getByRole('button', { name: /Plus tard/i });
if (await later.count()) {
  await later
    .first()
    .click()
    .catch(() => {});
}

// Collapse briefing if open so more of Comprendre fits
await page.locator('details').evaluateAll((nodes) => {
  for (const el of nodes) {
    if (/Briefing|Lire le briefing/i.test(el.textContent || '')) el.open = false;
  }
});

await page.locator('text=Comprendre').first().scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
// Nudge so bilan bottom + Comprendre cards are in frame
await page.evaluate(() => {
  /* eslint-disable no-undef -- Playwright runs this in the browser */
  const h = Array.from(document.querySelectorAll('h2')).find((n) =>
    /Comprendre/i.test(n.textContent || ''),
  );
  if (h) {
    const y = h.getBoundingClientRect().top + window.scrollY - 180;
    window.scrollTo(0, Math.max(0, y));
  }
});
await page.waitForTimeout(300);
await save(
  await page.screenshot({ type: 'png', fullPage: false }),
  'today_mobile_comprendre_cards.png',
);

await browser.close();
for (const dir of OUT) {
  const p = path.join(dir, 'today_mobile_comprendre_cards.png');
  console.log(p, fs.statSync(p).size);
}
