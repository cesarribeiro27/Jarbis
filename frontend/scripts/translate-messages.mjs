/**
 * Auto-translates new keys in pt-BR.json to all other locales.
 * Only translates keys that are MISSING in target locale (preserves existing translations).
 * Uses Google Translate unofficial API (same as the viewer page).
 *
 * Usage:
 *   node scripts/translate-messages.mjs
 *   node scripts/translate-messages.mjs --only en,es
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MESSAGES_DIR = path.join(__dirname, '../messages')

const LOCALES = [
  { code: 'en',    gtCode: 'en' },
  { code: 'es',    gtCode: 'es' },
  { code: 'fr',    gtCode: 'fr' },
  { code: 'de',    gtCode: 'de' },
  { code: 'it',    gtCode: 'it' },
  { code: 'zh',    gtCode: 'zh-CN' },
  { code: 'ja',    gtCode: 'ja' },
]

// Parse --only flag
const onlyArg = process.argv.find(a => a.startsWith('--only='))
const onlyLocales = onlyArg ? onlyArg.replace('--only=', '').split(',') : null

async function translateOne(text, tl) {
  if (!text || typeof text !== 'string') return text
  // Skip ICU placeholders — return as-is if it's just a placeholder
  // Preserve {placeholder} by replacing before/after translation
  const placeholders = []
  const sanitized = text.replace(/\{[^}]+\}/g, (match) => {
    placeholders.push(match)
    return `__PH${placeholders.length - 1}__`
  })

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=${tl}&dt=t&q=${encodeURIComponent(sanitized)}`
  try {
    const res = await fetch(url)
    if (!res.ok) return text
    const data = await res.json()
    let translated = data?.[0]?.map(s => s[0]).join('') || sanitized
    // Restore placeholders
    translated = translated.replace(/__PH(\d+)__/g, (_, i) => placeholders[parseInt(i)] || '')
    return translated
  } catch {
    return text
  }
}

// Collect all leaf paths from an object
function getLeafPaths(obj, prefix = '') {
  const paths = {}
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(paths, getLeafPaths(val, fullKey))
    } else if (Array.isArray(val)) {
      // Arrays: translate each string element
      paths[fullKey] = val
    } else {
      paths[fullKey] = val
    }
  }
  return paths
}

// Get nested value by dot-path
function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj)
}

// Set nested value by dot-path (mutates obj)
function setByPath(obj, dotPath, value) {
  const keys = dotPath.split('.')
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {}
    cur = cur[keys[i]]
  }
  cur[keys[keys.length - 1]] = value
}

async function translateLocale(sourceObj, targetObj, gtCode) {
  const sourcePaths = getLeafPaths(sourceObj)
  const missing = []

  for (const [path, val] of Object.entries(sourcePaths)) {
    const existing = getByPath(targetObj, path)
    if (existing === undefined || existing === null) {
      missing.push({ path, val })
    }
  }

  if (missing.length === 0) {
    console.log(`  → Nothing to translate`)
    return targetObj
  }

  console.log(`  → Translating ${missing.length} missing keys...`)

  for (const { path, val } of missing) {
    if (typeof val === 'string') {
      const translated = await translateOne(val, gtCode)
      setByPath(targetObj, path, translated)
    } else if (Array.isArray(val)) {
      const translated = await Promise.all(
        val.map(item => typeof item === 'string' ? translateOne(item, gtCode) : Promise.resolve(item))
      )
      setByPath(targetObj, path, translated)
    } else {
      setByPath(targetObj, path, val)
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 50))
  }

  return targetObj
}

async function main() {
  const sourcePath = path.join(MESSAGES_DIR, 'pt-BR.json')
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))

  const locales = onlyLocales
    ? LOCALES.filter(l => onlyLocales.includes(l.code))
    : LOCALES

  for (const { code, gtCode } of locales) {
    console.log(`\n[${code}] Translating...`)
    const targetPath = path.join(MESSAGES_DIR, `${code}.json`)
    let target = {}
    if (fs.existsSync(targetPath)) {
      target = JSON.parse(fs.readFileSync(targetPath, 'utf8'))
    }
    const updated = await translateLocale(source, target, gtCode)
    fs.writeFileSync(targetPath, JSON.stringify(updated, null, 2) + '\n', 'utf8')
    console.log(`  ✓ Saved ${code}.json`)
  }

  console.log('\nDone!')
}

main().catch(err => { console.error(err); process.exit(1) })
