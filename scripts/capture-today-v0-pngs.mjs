/**
 * Capture real PNG screenshots of Today V0 from the Vercel preview (demo mode).
 * Briefing API is mocked so « Briefing du jour » can be shown expanded.
 */
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const SHARE =
  'https://sharpit-git-cursor-today-v0-h-c9d2d8-augustin-briolons-projects.vercel.app/?_vercel_share=SjWewJj0btKb643MJyT7VrHqE9mdNaxN';
const ORIGIN = 'https://sharpit-git-cursor-today-v0-h-c9d2d8-augustin-briolons-projects.vercel.app';

const OUT_DIRS = [
  path.resolve('/workspace/docs/design/today-v0'),
  path.resolve('/opt/cursor/artifacts'),
];

const MOCK_BRIEFING = {
  briefing: {
    id: 'demo-briefing-v0',
    date: new Date().toISOString().slice(0, 10),
    content:
      'Journée active — le corps en demande encore un peu de récupération après le footing.\n\n' +
      'Priorité ce soir : coucher vers 20:57, hydratation et repas léger.\n\n' +
      'Demain : séance course prévue — aborde-la si le sommeil tient.',
    readiness: 68,
    generatedAt: new Date().toISOString(),
  },
};

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

async function main() {
  const browser = await chromium.launch({ headless: true });

  // --- Mobile ---
  const mobile = devices['iPhone 12'];
  const mobileContext = await browser.newContext({
    ...mobile,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'fr-FR',
  });
  await mobileContext.route('**/api/coach/briefing**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_BRIEFING),
    });
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(SHARE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await mobilePage.goto(`${ORIGIN}/demo`, { waitUntil: 'networkidle', timeout: 90000 });
  await mobilePage.goto(`${ORIGIN}/`, { waitUntil: 'networkidle', timeout: 90000 });
  await waitForHero(mobilePage);
  await dismissCriticalBanner(mobilePage);

  // Force briefing collapsed for the fold shot (morning defaults to open).
  await mobilePage.locator('details').evaluateAll((nodes) => {
    for (const el of nodes) {
      if (/Briefing|Lire le briefing/i.test(el.textContent || '')) {
        el.open = false;
      }
    }
  });
  await mobilePage.evaluate(() => window.scrollTo(0, 0));
  await mobilePage.waitForTimeout(300);
  await savePng(await mobilePage.screenshot({ type: 'png', fullPage: false }), 'today_mobile_fold.png');

  // Force briefing expanded with body in view.
  await mobilePage.locator('details').evaluateAll((nodes) => {
    for (const el of nodes) {
      if (/Briefing|Lire le briefing/i.test(el.textContent || '')) {
        el.open = true;
      }
    }
  });
  await mobilePage.waitForTimeout(400);
  const briefingHeading = mobilePage.locator('h2', { hasText: 'Briefing du jour' }).first();
  await briefingHeading.scrollIntoViewIfNeeded().catch(() => {});
  // Keep hero partially visible above briefing when possible
  await mobilePage.evaluate(() => {
    const h2 = Array.from(document.querySelectorAll('h2')).find((n) =>
      /Briefing du jour/i.test(n.textContent || ''),
    );
    if (h2) {
      const y = h2.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo(0, Math.max(0, y));
    }
  });
  await mobilePage.waitForTimeout(300);
  await savePng(
    await mobilePage.screenshot({ type: 'png', fullPage: false }),
    'today_mobile_briefing_open.png',
  );

  await mobileContext.close();

  // --- Desktop ---
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    locale: 'fr-FR',
  });
  await desktopContext.route('**/api/coach/briefing**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_BRIEFING),
    });
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(SHARE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await desktopPage.goto(`${ORIGIN}/demo`, { waitUntil: 'networkidle', timeout: 90000 });
  await desktopPage.goto(`${ORIGIN}/`, { waitUntil: 'networkidle', timeout: 90000 });
  await waitForHero(desktopPage);
  await dismissCriticalBanner(desktopPage);
  const dSummary = desktopPage.locator('summary').filter({ hasText: /Lire le briefing|Briefing du jour/i });
  if (await dSummary.count()) {
    const text = await dSummary.first().innerText();
    if (/Lire le briefing/i.test(text)) {
      await dSummary.first().click();
    }
  }
  await desktopPage.waitForTimeout(500);
  await desktopPage.evaluate(() => window.scrollTo(0, 0));
  await desktopPage.waitForTimeout(200);
  await savePng(await desktopPage.screenshot({ type: 'png', fullPage: false }), 'today_desktop.png');

  await desktopContext.close();
  await browser.close();

  for (const dir of OUT_DIRS) {
    for (const name of [
      'today_mobile_fold.png',
      'today_mobile_briefing_open.png',
      'today_desktop.png',
    ]) {
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
