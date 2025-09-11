# Agent Playbook: Prepare a Target Repo for LingoPilot Worker (pseudo + screenshots)

This playbook gives exact steps for an agent to modify a developer's application repo so the LingoPilot worker can run end‑to‑end. It adds:

- A `pseudo` script the worker calls to prepare localization artifacts.
- A `scripts/screenshots.js` script the worker calls to capture PNGs after the app is running.

The worker will:
1) Clone the repo at a commit SHA.
2) `npm ci`
3) `npm run pseudo`
4) `npm run build`
5) Start the app: `next start -p 3000`
6) `node scripts/screenshots.js`

## Prerequisites
- Default branch: `main`.
- The repo has a Next.js app that can build with `npm run build` and start with `next start`.
- A source locale file exists at `locales/en.json`.

## Step 1 — Add `pseudo` script
Option A (fastest): No‑op that exits 0.

1) Edit `package.json` to include:
```json
{
  "scripts": {
    "pseudo": "node -e \"console.log('pseudo step ok'); process.exit(0)\""
  }
}
```

Option B (standard): Real pseudo‑localization.

1) Create `scripts/pseudo.js`:
```js
// scripts/pseudo.js
// Pseudo-localize all string values in locales/en.json and write locales/en.pseudo.json
const fs = require('fs');
const path = require('path');

const src = path.join(process.cwd(), 'locales', 'en.json');
const dst = path.join(process.cwd(), 'locales', 'en.pseudo.json');

function pseudoize(value) {
  if (typeof value === 'string') return `⟦${value}⟧`;
  if (Array.isArray(value)) return value.map(pseudoize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = pseudoize(value[k]);
    return out;
  }
  return value;
}

function main() {
  if (!fs.existsSync(src)) {
    console.log('[pseudo] locales/en.json not found — skipping');
    process.exit(0);
  }
  const json = JSON.parse(fs.readFileSync(src, 'utf8'));
  const out = pseudoize(json);
  fs.writeFileSync(dst, JSON.stringify(out, null, 2));
  console.log(`[pseudo] wrote ${dst}`);
}

main();
```

2) Add the script to `package.json`:
```json
{
  "scripts": {
    "pseudo": "node scripts/pseudo.js"
  }
}
```

## Step 2 — Add screenshot runner
1) Install Puppeteer as a dev dependency:
```bash
npm i -D puppeteer
```

2) Create `scripts/screenshots.js`:
```js
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
      await page.waitForTimeout(500);
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
```

3) (Optional) Add a convenience script to `package.json` for local testing:
```json
{
  "scripts": {
    "screenshots": "node scripts/screenshots.js"
  }
}
```

## Step 3 — Verify locally
```bash
npm ci
npm run pseudo
npm run build
# In a separate shell, start the app
npx next start -p 3000 &
# Then run screenshots (uses default routes if LP_SCREENS is not set)
npm run screenshots
```
- Expect PNGs under `.lingopilot/screenshots/`.
- Exit code must be 0.

## Step 4 — Commit and push
```bash
git add package.json package-lock.json scripts/pseudo.js scripts/screenshots.js
git commit -m "chore: add pseudo + screenshots scripts for LingoPilot worker"
git push origin main
```

## Step 5 — Trigger from dashboard
- In LingoPilot dashboard → open your project → click "New run".
- The worker should now:
  - pass `npm run pseudo`
  - pass `npm run build`
  - serve on port 3000
  - execute `node scripts/screenshots.js` without error

## Troubleshooting
- __Cannot find module 'puppeteer'__: dev dependency missing → run `npm i -D puppeteer` and commit.
- __Missing script: "pseudo"__: add the `scripts.pseudo` entry in `package.json` (see Step 1).
- __Server not reachable__: ensure `next start -p 3000` succeeds locally; fix build errors.
- __No screenshots produced__: check `.lingopilot/screenshots/` exists and logs from the script for route errors.

## Rollback
- Remove `scripts/pseudo.js` and/or `scripts/screenshots.js` and delete the corresponding script entries in `package.json`.
- Commit: `git commit -m "chore: remove LingoPilot worker scripts"`.

## Acceptance checklist
- `package.json` has a `pseudo` script that exits 0.
- `scripts/screenshots.js` exists and works locally against `http://localhost:3000`.
- `npm run build` and `next start -p 3000` succeed.
- Triggering a run from the dashboard finishes the worker steps without script errors.
