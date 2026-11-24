// Real-mobile check: Android (Blink, Pixel 7 profile) and iPhone (WebKit, iPhone 15 profile), touch + mobile
// viewport. Slow-scrolls the page like a reader, flags content that is in view but invisible, anything wider
// than the screen, console errors, and failed requests; then a "fling to bottom" test for unrevealed content.
import { chromium, webkit, devices } from 'playwright-core';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const EDGE = process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const BASE = process.env.BASE || `file:///${REPO}/index.html`;
const OUT = `${REPO}/tools/.qa-shots/mobile`;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const targets = [
  ['android', chromium, { executablePath: EDGE }, devices['Pixel 7']],
  ['iphone', webkit, {}, devices['iPhone 15'] || devices['iPhone 14']],
];
const report = {};
const sep = BASE.includes('?') ? '&' : '?';

for (const [name, type, launchOpts, device] of targets) {
  let browser;
  try { browser = await type.launch({ headless: true, ...launchOpts }); }
  catch (e) { report[name] = { launchError: String(e).slice(0, 200) }; continue; }
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errors.push(`PAGEERR ${String(e).slice(0, 200)}`));
  page.on('requestfailed', (r) => errors.push(`REQFAIL ${r.url().slice(-80)} ${(r.failure() || {}).errorText || ''}`));

  const t0 = Date.now();
  await page.goto(`${BASE}${sep}m=${Date.now()}`, { waitUntil: 'load', timeout: 60000 });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(2500);
  const vh = device.viewport.height;
  const metrics = await page.evaluate(() => ({
    innerWidth, innerHeight,
    scrollW: document.documentElement.scrollWidth,
    max: document.documentElement.scrollHeight - innerHeight,
    pinned: document.documentElement.classList.contains('xp-pinned'),
    libs: { gsap: !!window.gsap, ST: !!window.ScrollTrigger, Split: !!window.SplitText, Lenis: !!window.Lenis },
    hover: matchMedia('(hover: hover)').matches, coarse: matchMedia('(pointer: coarse)').matches,
  }));

  const problems = new Map();
  let shot = 0;
  for (let y = 0, k = 0; ; y += Math.round(vh * 0.7), k += 1) {
    const target = Math.min(y, metrics.max);
    await page.evaluate((v) => window.scrollTo(0, v), target);
    await page.waitForTimeout(800);
    const found = await page.evaluate(() => {
      const out = [];
      const sel = 'main h1, main h2, main h3, main p, main li, main dd, main dt, main a, main img, main button, footer p';
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || el.closest('[aria-hidden="true"]')) continue;
        let op = 1;
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.display === 'none') { op = -1; break; }
          op *= Number(cs.opacity);
          if (cs.visibility === 'hidden') op = 0;
        }
        if (op < 0) continue;
        const inView = r.bottom > innerHeight * 0.2 && r.top < innerHeight * 0.75;
        const label = `${el.tagName} "${(el.textContent || el.alt || '').trim().replace(/\s+/g, ' ').slice(0, 38)}"`;
        if (inView && op < 0.5) out.push(`INVISIBLE ${label}`);
        if (r.right > innerWidth + 1 || r.left < -1) out.push(`TOO WIDE ${label} (${Math.round(r.left)}..${Math.round(r.right)})`);
      }
      return out;
    });
    found.forEach((f) => problems.set(f, (problems.get(f) || 0) + 1));
    if (k % 2 === 0) { await page.screenshot({ path: `${OUT}/${name}-${String(shot).padStart(2, '0')}.png` }); shot += 1; }
    if (target >= metrics.max) break;
  }

  // Fling test: fresh load, jump straight to the bottom, then everything must have revealed.
  await page.goto(`${BASE}${sep}j=${Date.now()}`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(2500);
  const stillHidden = await page.evaluate(() => [...document.querySelectorAll('.tile, .card, .facts > div, .xp-panel, .contact-links, .doc-card, .qr-card, .more, .skills h2, .work h2, .contact h2')]
    .filter((el) => Number(getComputedStyle(el).opacity) < 0.5).map((el) => `${el.tagName}.${el.className.split(' ')[0]}`));

  report[name] = { engine: type.name(), loadMs, metrics, errors, problems: [...problems.entries()].slice(0, 40), shots: shot, stillHiddenAfterFling: stillHidden };
  await browser.close();
}
console.log(JSON.stringify(report, null, 1));
