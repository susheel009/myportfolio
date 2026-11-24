// Visual + behavioural QA for the portfolio. Prints a JSON summary; screenshots go to ./shots.
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import fs from 'fs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const EDGE = process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = `file:///${REPO}/index.html`;
const OUT = `${REPO}/tools/.qa-shots`;
const only = process.argv[2] || 'all';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const report = {};

async function open(viewport, { dpr = 1, reduce = false } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  page.on('requestfailed', (r) => errors.push(`REQFAIL ${r.url().slice(-80)}`));
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2200);
  return { ctx, page, errors };
}
const go = async (page, y, wait = 1400) => { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(wait); };
const positions = (page) => page.evaluate(() => {
  const st = window.ScrollTrigger && ScrollTrigger.getAll().find((s) => s.pin);
  const y = (id) => Math.round(document.getElementById(id).getBoundingClientRect().top + scrollY);
  return { pinned: document.documentElement.classList.contains('xp-pinned'), xpStart: st ? st.start : null, xpEnd: st ? st.end : null, dur: st && st.animation ? st.animation.duration() : null,
    profile: y('profile'), experience: y('experience'), skills: y('skills'), work: y('work'), contact: y('contact'),
    max: document.documentElement.scrollHeight - innerHeight, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});
const xpState = (page) => page.evaluate(() => {
  const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom), Math.round(b.left), Math.round(b.right)]; };
  const panels = [...document.querySelectorAll('.xp-panel')];
  const visible = panels.map((p) => Number(getComputedStyle(p).opacity).toFixed(2));
  const shown = panels.find((p) => Number(getComputedStyle(p).opacity) > 0.5);
  const lastLine = shown ? [...shown.querySelectorAll('li, .xp-award')].pop() : null;
  return { visible, active: [...document.querySelectorAll('.xp-index li')].findIndex((li) => li.classList.contains('is-active')),
    chipsOn: document.querySelectorAll('.xp-toolkit li.is-on').length, panel: box(shown), panelLast: box(lastLine), toolkit: box(document.querySelector('.xp-toolkit')),
    index: box(document.querySelector('.xp-index-wrap')), year: box(document.querySelector('.xp-year')), vh: innerHeight,
    yearText: (() => { const y = document.querySelector('.xp-year'); const t = document.querySelector('.xp-year-track'); if (!y || !t) return null; const yb = y.getBoundingClientRect(); return [...t.children].find((s) => Math.abs(s.getBoundingClientRect().top - yb.top) < 6)?.textContent || null; })() };
});

if (only === 'all' || only === 'desktop') {
  for (const vp of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
    const tag = `${vp.width}x${vp.height}`;
    const { ctx, page, errors } = await open(vp);
    const pos = await positions(page);
    await page.screenshot({ path: `${OUT}/${tag}-01-hero.png` });
    await go(page, pos.profile + Math.round(vp.height * 0.35)); await page.screenshot({ path: `${OUT}/${tag}-02-profile.png` });
    const steps = [];
    if (pos.pinned) {
      for (let i = 0; i < 6; i += 1) {
        const t = i === 0 ? 0.1 : i + 0.12;
        await go(page, Math.round(pos.xpStart + (t / pos.dur) * (pos.xpEnd - pos.xpStart)), 1700);
        steps.push(await xpState(page));
        await page.screenshot({ path: `${OUT}/${tag}-03-xp-${i}.png` });
      }
      // mid-transition frame, to see the crossfade is clean
      await go(page, Math.round(pos.xpStart + (2.55 / pos.dur) * (pos.xpEnd - pos.xpStart)), 1700);
      await page.screenshot({ path: `${OUT}/${tag}-03-xp-transition.png` });
    }
    await go(page, pos.skills + 40); await page.screenshot({ path: `${OUT}/${tag}-04-skills.png` });
    await go(page, pos.skills + vp.height - 40); await page.screenshot({ path: `${OUT}/${tag}-05-skills2.png` });
    await go(page, pos.work + 40); await page.screenshot({ path: `${OUT}/${tag}-06-work.png` });
    await go(page, pos.work + vp.height - 40); await page.screenshot({ path: `${OUT}/${tag}-07-work2.png` });
    await go(page, pos.max, 2600); await page.screenshot({ path: `${OUT}/${tag}-08-contact.png` });
    let qr = null;
    const img = await page.$('.qr-wrap img');
    if (img) { const p = PNG.sync.read(await img.screenshot()); const d = jsQR(new Uint8ClampedArray(p.data), p.width, p.height); qr = d && d.data; }
    report[tag] = { pos, steps, qrRendered: qr, errors };
    await ctx.close();
  }
  // Monogram centring, measured on glyph pixels at 3x.
  const { ctx, page } = await open({ width: 1440, height: 900 }, { dpr: 3 });
  const el = await page.$('.monogram');
  const p = PNG.sync.read(await el.screenshot());
  const W = p.width, H = p.height, cx = (W - 1) / 2, cy = (H - 1) / 2, R = Math.min(W, H) / 2;
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    if ((x - cx) ** 2 + (y - cy) ** 2 > (0.7 * R) ** 2) continue;
    const i = (y * W + x) * 4; const L = 0.2126 * p.data[i] + 0.7152 * p.data[i + 1] + 0.0722 * p.data[i + 2];
    if (L > 150) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  report.monogram = { dxCssPx: (((x0 + x1) / 2 - cx) / 3).toFixed(2), dyCssPx: (((y0 + y1) / 2 - cy) / 3).toFixed(2), glyphW: ((x1 - x0) / 3).toFixed(1), glyphH: ((y1 - y0) / 3).toFixed(1) };
  await el.screenshot({ path: `${OUT}/monogram-3x.png` });
  await ctx.close();
}

if (only === 'all' || only === 'small') {
  for (const vp of [{ width: 834, height: 1112 }, { width: 390, height: 844 }]) {
    const tag = `${vp.width}x${vp.height}`;
    const { ctx, page, errors } = await open(vp, { dpr: 1 });
    const pos = await positions(page);
    // scroll through so reveal-on-scroll content is in its final state, then capture the whole page
    for (let y = 0; y <= pos.max; y += Math.round(vp.height * 0.6)) await go(page, y, 260);
    await go(page, pos.max, 1500);
    await page.screenshot({ path: `${OUT}/${tag}-full.png`, fullPage: true });
    report[tag] = { pos, errors };
    await ctx.close();
  }
  const { ctx, page, errors } = await open({ width: 1440, height: 900 }, { reduce: true });
  const pos = await positions(page);
  const hidden = await page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main li')].filter((e) => Number(getComputedStyle(e).opacity) < 0.5 || getComputedStyle(e).visibility === 'hidden').length);
  await go(page, pos.experience + 200, 500); await page.screenshot({ path: `${OUT}/reduced-xp.png` });
  report.reducedMotion = { pinned: pos.pinned, hiddenTextNodes: hidden, overflowX: pos.overflowX, errors };
  await ctx.close();
  // The résumé as printed
  const rp = await browser.newPage({ viewport: { width: 816, height: 1056 } });
  await rp.goto(`file:///${REPO}/src/resume.html`, { waitUntil: 'networkidle' });
  await rp.emulateMedia({ media: 'print' });
  await rp.evaluate(() => document.fonts.ready);
  await rp.screenshot({ path: `${OUT}/resume-print.png`, fullPage: true });
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.goto(`file:///${REPO}/assets/img/og-card.png`);
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
