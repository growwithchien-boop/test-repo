# Next.js i18n Sample Repo (For LingoPilot Dashboard Testing)

Goal
- Create a minimal Next.js repo that works perfectly with the LingoPilot dashboard MVP.
- Provide a consistent structure so preflight verification and project creation succeed on the first try.

What the dashboard expects
- Default branch: `main`.
- A locale JSON file at: `locales/en.json`.
- A few simple routes to screenshot and validate: `/`, `/about`, `/contact`, `/products`, `/checkout`.
- The app can be public or private (private supported via the LingoPilot GitHub App installation).

Repo name (suggested)
- `lingopilot-sample-nextjs-i18n`

Structure (recommended)
```
lingopilot-sample-nextjs-i18n/
  app/
    page.tsx
    about/page.tsx
    contact/page.tsx
    products/page.tsx
    checkout/page.tsx
  locales/
    en.json
  package.json
  tsconfig.json
  next.config.mjs
  README.md
```

Minimal content examples
- `locales/en.json`
```json
{
  "title": "Welcome to LingoPilot sample",
  "subtitle": "Localization QA MVP",
  "about": "About",
  "contact": "Contact",
  "products": "Products",
  "checkout": "Checkout"
}
```

- `app/page.tsx`
```tsx
export default function Page() {
  const t = require("../locales/en.json")
  return (
    <main style={{ padding: 24 }}>
      <h1>{t.title}</h1>
      <p>{t.subtitle}</p>
      <nav style={{ marginTop: 16 }}>
        <a href="/about">{t.about}</a> · {" "}
        <a href="/contact">{t.contact}</a> · {" "}
        <a href="/products">{t.products}</a> · {" "}
        <a href="/checkout">{t.checkout}</a>
      </nav>
    </main>
  )
}
```

- For `about`, `contact`, `products`, `checkout` pages, copy the same pattern and vary the heading:
```tsx
export default function AboutPage() {
  const t = require("../../locales/en.json")
  return (
    <main style={{ padding: 24 }}>
      <h1>{t.about}</h1>
      <p>Simple static page for dashboard testing.</p>
    </main>
  )
}
```

Notes
- This keeps i18n super simple (static import from `locales/en.json`). You can swap to `next-intl` or `next-i18next` later; the dashboard only needs a stable JSON path for preflight and later processing.
- If you add a second locale (e.g., `locales/es.json`), that’s fine; not required for MVP.

How to create the repo (fresh account, step-by-step)
1) Create a new repository on GitHub (suggested name above). Set default branch to `main`.
2) Clone it locally and initialize a minimal Next.js project:
```
npm init -y
npm i next react react-dom
npx next telemetry disable
```
3) Add the directory structure and files from the “Structure” and “Minimal content” sections above.
4) Add simple Next.js config files:
- `next.config.mjs`
```js
/** @type {import('next').NextConfig} */
const nextConfig = {}
export default nextConfig
```
- `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```
- `package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```
5) Commit and push:
```
git add .
git commit -m "Initial minimal Next.js i18n sample"
git push origin main
```

Connect LingoPilot (dev) to this repo
1) Install the LingoPilot GitHub App for the org/user containing this repo.
2) In the LingoPilot dashboard (dev, via ngrok):
   - Open “New Project”.
   - Choose GitHub Integration → select your new repo.
   - Default branch: `main`.
   - Source locale path: `locales/en.json`.
   - Routes: `/`, `/about`, `/contact`, `/products`, `/checkout`.
   - Click “Verify” next to the path; it should say “File exists on branch”.
   - Click “Create project”. Expect success toast and navigation.

Troubleshooting
- Verify shows “File not found”
  - Check default branch is `main` and path is exactly `locales/en.json`.
  - Check that the GitHub App is installed for this repo.
- Projects API 401
  - Session might be invalid. Sign out/in and try again.
- Repos don’t list
  - Confirm GitHub App installation for the org and that the dashboard shows “Connected”.

Going beyond MVP (optional)
- Introduce a real i18n library (e.g., `next-intl`, `next-i18next`) later.
- Add `locales/es.json` and switch the sample pages to prefer a `locale` param.
- Add mock product content to `products` to produce richer screenshots.

Acceptance checklist for the repo
- Default branch is `main`.
- `locales/en.json` exists and is committed.
- Pages exist for the 5 routes listed above and render text from `en.json`.
- The LingoPilot dashboard Verify step succeeds for `locales/en.json`.
- Project creation succeeds and appears on the dashboard.
