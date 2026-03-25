#!/usr/bin/env node
/**
 * Lead Generation Script
 * Finds local businesses via Google Places, mines reviews for pain points,
 * enriches with Hunter.io email lookup, and outputs CSV + JSON.
 *
 * Usage:
 *   Single: node scripts/generate-leads.js --vertical "dentist" --location "Fairburn, GA" --radius 15
 *   Batch:  node scripts/generate-leads.js --batch scripts/batch-searches.json
 *
 * Env vars (loaded from .env automatically):
 *   GOOGLE_PLACES_API_KEY — required
 *   HUNTER_API_KEY        — optional (skips enrichment if missing)
 */

'use strict'

const fs    = require('fs')
const path  = require('path')
const https = require('https')

// ── .env loader ───────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !(key in process.env)) process.env[key] = val
  }
}

loadEnv()

// ── Constants ─────────────────────────────────────────────────────────────────

const GOOGLE_KEY     = process.env.GOOGLE_PLACES_API_KEY
const HUNTER_KEY     = process.env.HUNTER_API_KEY
const MILES_TO_M     = 1609.34
const HUNTER_DELAY   = 1100   // ms between Hunter calls (free tier: 1 req/sec)
const PLACES_DELAY   = 200    // ms between Places calls
const PAGE_DELAY     = 2200   // Google requires ~2s delay before next_page_token is valid
const MAX_PAGES      = 3      // 3 pages × 20 results = up to 60 per search
const GUESS_PATTERNS = ['info', 'office', 'contact', 'hello']

const PAIN_KEYWORDS  = [
  'voicemail', "didn't answer", 'did not answer', 'on hold',
  "couldn't reach", 'could not reach', 'no one answered', 'nobody answered',
  'called multiple times', 'never called back', 'rude receptionist',
  "couldn't book", 'could not book', 'closed when i called',
  'after hours', 'never answered', 'goes to voicemail',
  'no answer', 'not answering', 'hung up', 'put me on hold',
]

const OUTPUT_HEADERS = [
  'business_name', 'address', 'phone', 'website', 'google_maps_url',
  'rating', 'review_count', 'hours',
  'owner_name', 'owner_email', 'owner_title', 'email_status',
  'hot_lead', 'pain_point_evidence',
]

// ── CLI arg parser ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const result = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      result[args[i].slice(2)] = args[i + 1] || ''
      i++
    }
  }
  return result
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { reject(new Error(`Invalid JSON from API (status ${res.statusCode})`)) }
      })
    }).on('error', reject)
  })
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function csvEscape(val) {
  const s = String(val ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function writeCsv(rows, headers, filePath) {
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => csvEscape(r[h] ?? '')).join(',')),
  ]
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8')
}

// ── Slug helper ───────────────────────────────────────────────────────────────

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── Domain extractor ──────────────────────────────────────────────────────────

function extractDomain(website) {
  if (!website) return null
  try {
    const url = website.startsWith('http') ? website : 'https://' + website
    return new URL(url).hostname.replace(/^www\./, '')
  } catch { return null }
}

// ── Google APIs ───────────────────────────────────────────────────────────────

async function geocode(location) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(location)}&key=${GOOGLE_KEY}`
  const { body } = await get(url)
  if (body.status !== 'OK' || !body.results.length) {
    throw new Error(`Geocoding failed for "${location}": ${body.status}`)
  }
  return body.results[0].geometry.location  // { lat, lng }
}

async function nearbySearchPage(lat, lng, radiusM, vertical, pageToken) {
  let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${lat},${lng}&radius=${Math.round(radiusM)}&keyword=${encodeURIComponent(vertical)}&key=${GOOGLE_KEY}`
  if (pageToken) url += `&pagetoken=${encodeURIComponent(pageToken)}`
  const { body } = await get(url)
  return body  // { results, next_page_token, status }
}

async function getAllPlaceIds(lat, lng, radiusM, vertical) {
  const ids = []
  let pageToken = null
  let page = 0

  while (page < MAX_PAGES) {
    if (pageToken) await sleep(PAGE_DELAY)
    const body = await nearbySearchPage(lat, lng, radiusM, vertical, pageToken)

    if (body.status === 'ZERO_RESULTS') break
    if (body.status !== 'OK') {
      console.warn(`  ⚠ Places search returned status: ${body.status}`)
      break
    }

    for (const r of body.results) ids.push(r.place_id)
    pageToken = body.next_page_token || null
    page++
    if (!pageToken) break
  }

  return ids
}

async function placeDetails(placeId) {
  const fields = [
    'name', 'formatted_address', 'formatted_phone_number',
    'website', 'rating', 'user_ratings_total',
    'opening_hours', 'url', 'reviews',
  ].join(',')
  const url = `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${placeId}&fields=${fields}&key=${GOOGLE_KEY}`
  const { body } = await get(url)
  if (body.status !== 'OK') return null
  return body.result
}

// ── Pain-point scanner ────────────────────────────────────────────────────────

function scanReviews(reviews = []) {
  const evidence = []
  for (const review of reviews) {
    const text = (review.text || '').toLowerCase()
    for (const kw of PAIN_KEYWORDS) {
      if (text.includes(kw)) {
        const snippet = review.text.slice(0, 200).replace(/\n/g, ' ')
        evidence.push(`"${snippet}"`)
        break  // one match per review is enough
      }
    }
  }
  return evidence
}

// ── Hunter.io ─────────────────────────────────────────────────────────────────

async function hunterDomainSearch(domain) {
  const url = `https://api.hunter.io/v2/domain-search` +
    `?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_KEY}`
  const { status, body } = await get(url)
  if (status !== 200) return null
  const emails = body.data?.emails
  if (!emails || emails.length === 0) return null
  const preferred = emails.find(e =>
    /owner|manager|director|founder|president|office|admin/i.test(e.position || '')
  ) || emails[0]
  return {
    email:     preferred.value,
    firstName: preferred.first_name || '',
    lastName:  preferred.last_name  || '',
    position:  preferred.position   || '',
  }
}

// ── Process one business ──────────────────────────────────────────────────────

let lastHunterCall = 0

async function enrichWithHunter(domain) {
  if (!HUNTER_KEY) return { owner_name: '', owner_email: '', owner_title: '', email_status: 'skipped' }

  // Rate limit
  const now = Date.now()
  const wait = HUNTER_DELAY - (now - lastHunterCall)
  if (wait > 0) await sleep(wait)
  lastHunterCall = Date.now()

  try {
    const result = await hunterDomainSearch(domain)
    if (result) {
      const owner_name = [result.firstName, result.lastName].filter(Boolean).join(' ')
      return { owner_name, owner_email: result.email, owner_title: result.position, email_status: 'found' }
    }
  } catch (e) {
    console.warn(`    Hunter error for ${domain}: ${e.message}`)
  }

  // Fallback: guess patterns
  const guesses = GUESS_PATTERNS.map(p => `${p}@${domain}`)
  return { owner_name: '', owner_email: guesses.join(' | '), owner_title: '', email_status: 'guessed' }
}

async function processBusiness(placeId, idx, total) {
  await sleep(PLACES_DELAY)
  let detail
  try { detail = await placeDetails(placeId) } catch (e) {
    console.warn(`  [${idx}/${total}] Place Details error: ${e.message}`)
    return null
  }
  if (!detail) return null

  const name    = detail.name || ''
  const address = detail.formatted_address || ''
  const phone   = detail.formatted_phone_number || ''
  const website = detail.website || ''
  const rating  = detail.rating ?? ''
  const reviewCount = detail.user_ratings_total ?? ''
  const hours   = (detail.opening_hours?.weekday_text || []).join(' | ')
  const mapsUrl = detail.url || ''
  const reviews = detail.reviews || []

  // Pain-point scan
  const evidence = scanReviews(reviews)
  const hot_lead = evidence.length > 0 ? 'YES' : ''
  const pain_point_evidence = evidence.join(' | ')

  process.stdout.write(`  [${idx}/${total}] ${name}`)
  if (hot_lead) process.stdout.write(' 🔥 HOT LEAD')

  // Hunter enrichment
  const domain = extractDomain(website)
  let enrichment = { owner_name: '', owner_email: '', owner_title: '', email_status: '' }
  if (domain) {
    process.stdout.write(' — enriching...')
    enrichment = await enrichWithHunter(domain)
    process.stdout.write(` [${enrichment.email_status}]`)
  }
  process.stdout.write('\n')

  return {
    business_name: name, address, phone, website, google_maps_url: mapsUrl,
    rating, review_count: reviewCount, hours,
    ...enrichment,
    hot_lead, pain_point_evidence,
  }
}

// ── Run one search ────────────────────────────────────────────────────────────

async function runSearch({ vertical, location, radius = 15 }) {
  const radiusM = parseFloat(radius) * MILES_TO_M
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  Vertical : ${vertical}`)
  console.log(`  Location : ${location}`)
  console.log(`  Radius   : ${radius} miles (${Math.round(radiusM)}m)`)
  console.log('─'.repeat(60))

  // 1. Geocode
  process.stdout.write('  Geocoding location...')
  let latLng
  try { latLng = await geocode(location) } catch (e) {
    console.log(` FAILED: ${e.message}`)
    return []
  }
  console.log(` ${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`)

  // 2. Collect place IDs (up to 60)
  process.stdout.write('  Searching Google Places...')
  let placeIds
  try { placeIds = await getAllPlaceIds(latLng.lat, latLng.lng, radiusM, vertical) } catch (e) {
    console.log(` FAILED: ${e.message}`)
    return []
  }
  console.log(` ${placeIds.length} businesses found`)

  if (placeIds.length === 0) return []

  // 3. Fetch details + enrich each business
  console.log('  Processing businesses...')
  const rows = []
  for (let i = 0; i < placeIds.length; i++) {
    const row = await processBusiness(placeIds[i], i + 1, placeIds.length)
    if (row) rows.push(row)
  }

  return rows
}

// ── Summary printer ───────────────────────────────────────────────────────────

function printSummary(rows, label = '') {
  const total      = rows.length
  const emailsFound = rows.filter(r => r.email_status === 'found').length
  const emailsGuess = rows.filter(r => r.email_status === 'guessed').length
  const hotLeads   = rows.filter(r => r.hot_lead === 'YES').length

  console.log(`
${'━'.repeat(50)}
  ${label ? label + ' ' : ''}Summary
${'━'.repeat(50)}
  Total businesses:    ${total}
  Emails found:        ${emailsFound}
  Emails guessed:      ${emailsGuess}
  Hot leads (🔥):      ${hotLeads}
${'━'.repeat(50)}`)
}

// ── Write outputs ─────────────────────────────────────────────────────────────

function writeOutputs(rows, baseName) {
  // Sort: hot leads first, then by rating desc
  rows.sort((a, b) => {
    if (a.hot_lead === 'YES' && b.hot_lead !== 'YES') return -1
    if (b.hot_lead === 'YES' && a.hot_lead !== 'YES') return 1
    return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0)
  })

  const outDir  = path.join(__dirname, '..', 'data')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const csvPath  = path.join(outDir, `${baseName}.csv`)
  const jsonPath = path.join(outDir, `${baseName}.json`)

  writeCsv(rows, OUTPUT_HEADERS, csvPath)
  fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), 'utf8')

  console.log(`\n  📄 CSV  → ${csvPath}`)
  console.log(`  📦 JSON → ${jsonPath}`)
  return csvPath
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs()

  // Validate Google key
  if (!GOOGLE_KEY) {
    console.error(`
ERROR: GOOGLE_PLACES_API_KEY is not set.

To get one:
  1. Go to https://console.cloud.google.com/
  2. Create a project and enable:
       - Places API
       - Geocoding API
  3. Go to "Credentials" → "Create credentials" → "API key"
  4. Set it: export GOOGLE_PLACES_API_KEY=your_key
     or add it to your .env file
`)
    process.exit(1)
  }

  if (!HUNTER_KEY) {
    console.warn('  ⚠ HUNTER_API_KEY not set — email enrichment will be skipped.\n')
  }

  // ── Batch mode ─────────────────────────────────────────────────────────────
  if (args.batch) {
    if (!fs.existsSync(args.batch)) {
      console.error(`Batch file not found: ${args.batch}`)
      process.exit(1)
    }
    let searches
    try { searches = JSON.parse(fs.readFileSync(args.batch, 'utf8')) } catch (e) {
      console.error(`Invalid JSON in batch file: ${e.message}`)
      process.exit(1)
    }
    if (!Array.isArray(searches) || searches.length === 0) {
      console.error('Batch file must be a non-empty JSON array.')
      process.exit(1)
    }

    console.log(`\nBatch mode — ${searches.length} searches queued`)
    const allRows = []

    for (const search of searches) {
      const rows = await runSearch(search)
      for (const r of rows) {
        r._search_vertical = search.vertical
        r._search_location = search.location
      }
      allRows.push(...rows)
    }

    const dateStr = new Date().toISOString().slice(0, 10)
    const baseName = `leads-batch-${dateStr}`
    const csvPath = writeOutputs(allRows, baseName)
    printSummary(allRows, 'Batch')

    console.log(`\n✅ Batch complete. Master file: ${csvPath}\n`)
    return
  }

  // ── Single search mode ─────────────────────────────────────────────────────
  if (!args.vertical || !args.location) {
    console.error(`
Usage:
  Single: node scripts/generate-leads.js --vertical "dentist" --location "Fairburn, GA" --radius 15
  Batch:  node scripts/generate-leads.js --batch scripts/batch-searches.json
`)
    process.exit(1)
  }

  const vertical = args.vertical
  const location = args.location
  const radius   = parseFloat(args.radius) || 15

  const rows = await runSearch({ vertical, location, radius })

  if (rows.length === 0) {
    console.log('\nNo results found.')
    return
  }

  const baseName = `leads-${slug(vertical)}-${slug(location)}`
  writeOutputs(rows, baseName)
  printSummary(rows)

  console.log('\n✅ Done.\n')
}

main().catch(err => {
  console.error('\nFatal error:', err.message)
  process.exit(1)
})
