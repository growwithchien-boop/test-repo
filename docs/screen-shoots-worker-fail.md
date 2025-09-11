Here’s a focused breakdown of why the worker is failing and how to fix it quickly.

What we know
- The worker reaches the screenshot phase and executes:
  node scripts/screenshots.js
- It exits with code 1 and no useful log is captured by execa.
- Your local repo runs fine (PNG files are produced locally), so the failure is environment- or timing-specific in the worker.

Most likely causes
- Missing devDependencies in worker: If npm ci is run with NODE_ENV=production or --omit=dev, puppeteer isn’t installed and require('puppeteer') throws. In some setups this error doesn’t propagate to logs cleanly.
- ESM/CJS mismatch: If the repo has "type": "module" and scripts/screenshots.js uses require(), Node 20 will throw “require is not defined in ES module scope.” Locally it may have worked if type wasn’t set or you used a different Node version.
- App not reachable when the script starts: Next server may not be fully ready (or it’s bound to 0.0.0.0 and the script hits localhost). page.goto can time out and exit(1).
- Silent unhandled error in the script before logging: e.g., throw before the first console.log, or an exception during import.

Immediate fixes (do these now)
1) Make the screenshot script self-diagnosing and compatible (works for both CJS/ESM)
Replace the top of scripts/screenshots.js with this minimal shim so we always log what’s wrong:
```js
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
        await page.waitForTimeout(750);
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
```
- Key changes:
  - Logs Node version, cwd, and LP_BASE_URL at start.
  - Loads puppeteer via require() with a fallback to dynamic import for ESM repos.
  - Uses 127.0.0.1 instead of localhost (avoids some resolution quirks).
  - Increases navigation timeout to 120s and adds more logging.

2) Ensure devDependencies are installed in the worker
- The worker must run npm ci with dev deps. If it sets NODE_ENV=production, puppeteer won’t be installed.
- In the worker, make sure:
  - Either NODE_ENV is not set to production during npm ci, or
  - npm ci --include=dev is explicitly used.
- As a quick check, log the puppeteer version before the script runs:
  node -e "console.log(require('puppeteer/package.json').version)"

3) Confirm server ready before running screenshots
- Your worker already logs server healthy; keep a short poll that retries GET http://127.0.0.1:3000/ for ~15s before launching the script, just in case.
- Alternatively, set a tiny delay (e.g., 1s) between server healthy and running screenshots.

4) If your repo uses "type": "module"
- The shim above already handles it.
- If you want the simplest fix: rename scripts to .cjs (scripts/screenshots.cjs and scripts/pseudo.cjs) and update package.json scripts accordingly. This forces CommonJS even in ESM repos.

Why this likely resolves your failure
- If the error stemmed from missing puppeteer or ESM/CJS mismatch, the shim logs a clear error and still fails gracefully with a helpful message.
- If it’s a timing issue reaching the server, the longer timeout and 127.0.0.1 URL reduce flakiness and will log non-OK routes before failing.

Suggested worker hardening (soon)
- Ensure dev deps install: npm ci (no production pruning) or npm ci --include=dev.
- Add captured stdout/stderr from the screenshots script into logs (execa options), so we always see the “[screenshots] failed: …” message.
- If you plan to go zero-install for customers, embed a fallback screenshot runner in the worker and skip calling repo scripts unless present.

Once you drop the shim in and confirm puppeteer is installed by the worker, re-run from the dashboard. If it still fails, paste the new “[screenshots] …” logs and I’ll pinpoint the root cause quickly.