// Generates the QR code, the social card, and the public résumé PDF, and verifies the QR decodes.
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import fs from 'fs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const EDGE = process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const QR_URL = 'https://github.com/susheel009?tab=repositories';

const svg = await QRCode.toString(QR_URL, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#16201bff', light: '#ffffffff' } });
fs.writeFileSync(`${REPO}/assets/img/github-qr.svg`, svg);
const png = PNG.sync.read(await QRCode.toBuffer(QR_URL, { type: 'png', errorCorrectionLevel: 'M', margin: 2, scale: 8 }));
const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
console.log('qr-file-decodes-to', decoded && decoded.data);

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await og.goto(`file:///${REPO}/src/og-card.html`, { waitUntil: 'networkidle' });
await og.evaluate(() => document.fonts.ready);
await og.waitForTimeout(300);
await og.screenshot({ path: `${REPO}/assets/img/og-card.png` });

const cv = await browser.newPage();
await cv.goto(`file:///${REPO}/src/resume.html`, { waitUntil: 'networkidle' });
await cv.evaluate(() => document.fonts.ready);
await cv.waitForTimeout(300);
await cv.pdf({
  path: `${REPO}/assets/files/Susheel-Mondithoka-Resume.pdf`, format: 'Letter', printBackground: true,
  margin: { top: '0.5in', bottom: '0.5in', left: '0.6in', right: '0.6in' },
});
await browser.close();
for (const f of ['assets/img/github-qr.svg', 'assets/img/og-card.png', 'assets/files/Susheel-Mondithoka-Resume.pdf']) {
  console.log(f, fs.statSync(`${REPO}/${f}`).size, 'bytes');
}
