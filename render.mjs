// node render.mjs [frames 'a-b' | '1,5,9'] [outDir]   env RESUME=1 skips existing
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'fs'; import { server } from './serve.mjs';
const spec = process.argv[2] || '0-2314', out = process.argv[3] || 'frames';
const list = spec.split(',').flatMap((p) => { const [a, b] = p.split('-').map(Number); return b === undefined ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i); });
fs.mkdirSync(out, { recursive: true });
const port = 8200 + Math.floor(Math.random() * 700);
await new Promise((r) => server.listen(port, r));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction('window.ready === true', null, { timeout: 120000 });
const t0 = Date.now(); let n = 0;
for (const f of list) {
  const fn = `${out}/f${String(f).padStart(4, '0')}.jpg`;
  if (process.env.RESUME && fs.existsSync(fn)) continue;
  const url = await page.evaluate((f) => { window.renderFrame(f); return document.getElementById('c').toDataURL('image/jpeg', .95); }, f);
  fs.writeFileSync(fn, Buffer.from(url.split(',')[1], 'base64')); n++;
  if (n % 10 === 0 || n === 1) console.log(`f${f} done  ${((Date.now() - t0) / n / 1000).toFixed(2)} s/frame`);
}
await browser.close(); server.close();
console.log('rendered', n, 'frames in', ((Date.now() - t0) / 1000).toFixed(0), 's');
