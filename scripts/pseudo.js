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
