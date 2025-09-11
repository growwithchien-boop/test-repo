// scripts/screenshots.js
// Capture screenshots of routes from a running Next.js app on http://localhost:3000.
// Optional env:
//   LP_BASE_URL   default http://localhost:3000
//   LP_SCREENS    JSON array of routes e.g. '["/","/about"]'
//   LP_OUTPUT_DIR default ./.lingopilot/screenshots
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function parseScreens() {
  const raw = process.env.LP_SCREENS;
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.every((s) => typeof s === 'string')) return arr;
    } catch {}
  }
  return ['/', '/about', '/contact', '/products', '/checkout'];
}

function routeToFileName(route) {
  const safe = route.replace(/[^a-z0-9/_-]/gi, '').replace(/\//g, '_');
  return safe.length ? safe : 'home';
}

async function main() {
  const baseUrl = process.env.LP_BASE_URL || 'http://localhost:3000';
  const outDir = process.env.LP_OUTPUT_DIR || path.join('.lingopilot', 'screenshots');
  const screens = parseScreens();

  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    for (const route of screens) {
      const url = `${baseUrl}${route}`;
      console.log('[screenshots] visiting', url);
      const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
      if (!resp || !resp.ok()) console.warn(`[screenshots] non-OK for ${url}:`, resp && resp.status());
      await new Promise(r => setTimeout(r, 500));
      const file = path.join(outDir, `${routeToFileName(route)}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log('[screenshots] wrote', file);
    }
  } finally {
    await browser.close();
  }
  console.log('[screenshots] done');
}

main().catch((err) => { console.error('[screenshots] failed:', err); process.exit(1); });
