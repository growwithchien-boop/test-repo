# Pseudo Script Requirements for Target Repositories

This guide explains exactly what your application repository must contain so the LingoPilot worker can process a job successfully. Share this with any team creating or onboarding a repo for testing.

## TL;DR
- You MUST add a `pseudo` script to `package.json` in the target repo.
- The worker will run `npm ci` and then `npm run pseudo` at the checked-out commit.
- The script can be a no-op that exits with code 0, or it can perform real pseudo-localization. It must not hang and must exit(0) on success.

## Why is this required?
The worker expects a conventional entry-point to prepare your project for localization QA (e.g., transform `locales/en.json`, generate artifacts, etc.). Until we standardize a richer protocol, it simply invokes `npm run pseudo`.

## Option A — Minimal No-Op (quick pass)
This satisfies the worker now and is recommended for first-time setup.

1) Edit your repo's `package.json` and add:
```json
{
  "scripts": {
    "pseudo": "node -e \"console.log('pseudo step ok'); process.exit(0)\""
  }
}
```
2) Commit and push to `main`.
3) Trigger a run from the dashboard. The worker will succeed past the `pseudo` step.

## Option B — Standard Pseudo Localization Script
Add a small Node script that wraps every string value in `locales/en.json` with markers (e.g., `⟦text⟧`).

1) Create `scripts/pseudo.js` in your repo:
```js
// scripts/pseudo.js
// Pseudo-localize all string values in locales/en.json and write to locales/en.pseudo.json
const fs = require('fs');
const path = require('path');

const src = path.join(process.cwd(), 'locales', 'en.json');
const dst = path.join(process.cwd(), 'locales', 'en.pseudo.json');

function pseudoize(value) {
  if (typeof value === 'string') return `⟦${value}⟧`
  if (Array.isArray(value)) return value.map(pseudoize)
  if (value && typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value)) out[k] = pseudoize(value[k])
    return out
  }
  return value
}

function main() {
  if (!fs.existsSync(src)) {
    console.log('[pseudo] locales/en.json not found — skipping')
    process.exit(0)
  }
  const json = JSON.parse(fs.readFileSync(src, 'utf8'))
  const out = pseudoize(json)
  fs.writeFileSync(dst, JSON.stringify(out, null, 2))
  console.log(`[pseudo] wrote ${dst}`)
}

main()
```

2) Add the script to `package.json`:
```json
{
  "scripts": {
    "pseudo": "node scripts/pseudo.js"
  }
}
```

3) Commit and push:
```bash
git add scripts/pseudo.js package.json
git commit -m "chore: add pseudo script for LingoPilot worker"
git push origin main
```

4) Trigger a run from the dashboard. The worker will:
- `npm ci`
- `npm run pseudo` → generates `locales/en.pseudo.json`
- continue with the rest of the job

## Verification (local)
Run this in the target repo:
```bash
npm ci
npm run pseudo
```
- Expect either a console line `pseudo step ok` (Option A) or `wrote locales/en.pseudo.json` (Option B).
- Exit code should be 0.

## FAQ
- "Does my local repo have this script by default?" — No. You must add it.
- "Yarn/PNPM?" — NPM is assumed. If you use Yarn/PNPM, keep the `pseudo` script but your worker will still call `npm run pseudo` inside the job container; ensure `npm` works.
- "Can I rename the script?" — Not yet. The worker calls `npm run pseudo` specifically.

## Acceptance Checklist for Target Repos
- `package.json` includes a `pseudo` script.
- Running `npm run pseudo` exits with code 0.
- `locales/en.json` exists and is valid JSON.
- Default branch is `main`.
