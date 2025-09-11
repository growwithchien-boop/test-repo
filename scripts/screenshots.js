(async () => {
  try {
    console.log('[screenshots] starting');
    console.log('[screenshots] Node', process.version, 'cwd', process.cwd());
    console.log('[screenshots] LP_BASE_URL', process.env.LP_BASE_URL || 'http://localhost:3000');

    // Try both require and dynamic import to handle CJS/ESM
    let puppeteer;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      puppeteer = require('puppeteer');
    } catch {
      puppeteer = (await import('puppeteer')).default;
    }

    const fs = require('fs');
    const path = require('path');

    function parseScreens() {
      const raw = process.env.LP_SCREENS;
      if (raw) {
        try {
          const a = JSON.parse(raw);
          if (Array.isArray(a) && a.every((s) => typeof s === 'string')) return a;
        } catch {}
      }
      return ['/', '/about', '/contact', '/products', '/checkout'];
    }
    function routeToFileName(route) {
      const safe = route.replace(/[^a-z0-9/_-]/gi, '').replace(/\//g, '_');
      return safe.length ? safe : 'home';
    }

    const baseUrl = process.env.LP_BASE_URL || 'http://127.0.0.1:3000';
    const outDir = process.env.LP_OUTPUT_DIR || path.join('.lingopilot', 'screenshots');
    const screens = parseScreens();
    fs.mkdirSync(outDir, { recursive: true });

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      for (const r of screens) {
        const url = `${baseUrl}${r}`;
        console.log('[screenshots] visiting', url);
        const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 120_000 });
        if (!resp || !resp.ok()) console.warn('[screenshots] non-OK', r, resp && resp.status());
        await new Promise(r => setTimeout(r, 750));
        const file = path.join(outDir, `${routeToFileName(r)}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log('[screenshots] wrote', file);
      }
    } finally {
      await browser.close();
    }
    console.log('[screenshots] done');
    process.exit(0);
  } catch (err) {
    console.error('[screenshots] failed:', err);
    process.exit(1);
  }
})();