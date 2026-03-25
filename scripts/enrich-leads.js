#!/usr/bin/env node
/**
 * Lead Enrichment Script
 * Usage: node scripts/enrich-leads.js leads.csv
 *
 * Reads a CSV with columns: business_name, address, phone, rating, reviews, website
 * Calls Hunter.io to find owner email, verifies it, and outputs leads-enriched.csv
 * For businesses with no Hunter results, guesses common email patterns.
 *
 * Requires: HUNTER_API_KEY env var
 */

'use strict'

const fs   = require('fs')
const path = require('path')
const https = require('https')

// ── Config ────────────────────────────────────────────────────────────────────

const HUNTER_KEY    = process.env.HUNTER_API_KEY
const RATE_LIMIT_MS = 1000   // 1 request per second (Hunter free tier)
const GUESS_PATTERNS = ['info', 'office', 'contact', 'hello']

// ── CLI ───────────────────────────────────────────────────────────────────────

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: node scripts/enrich-leads.js leads.csv')
  process.exit(1)
}
if (!HUNTER_KEY) {
  console.error('Error: HUNTER_API_KEY environment variable is not set.')
  process.exit(1)
}
if (!fs.existsSync(csvPath)) {
  console.error(`Error: File not found: ${csvPath}`)
  process.exit(1)
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function parseCsv(raw) {
  const lines = raw.trim().split(/\r?\n/)
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = splitCsvLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').trim() })
    return row
  })
}

function splitCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function toCsvLine(row, headers) {
  return headers.map(h => {
    const val = String(row[h] ?? '')
    return val.includes(',') || val.includes('"') || val.includes('\n')
      ? `"${val.replace(/"/g, '""')}"`
      : val
  }).join(',')
}

function writeCsv(rows, headers, outPath) {
  const lines = [headers.join(','), ...rows.map(r => toCsvLine(r, headers))]
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8')
}

// ── Domain extraction ─────────────────────────────────────────────────────────

function extractDomain(website) {
  if (!website) return null
  try {
    const url = website.startsWith('http') ? website : 'https://' + website
    const { hostname } = new URL(url)
    return hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { reject(new Error('Invalid JSON from: ' + url)) }
      })
    }).on('error', reject)
  })
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Hunter.io API calls ───────────────────────────────────────────────────────

async function hunterDomainSearch(domain) {
  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_KEY}`
  const { status, body } = await get(url)
  if (status !== 200) return null
  const emails = body.data?.emails
  if (!emails || emails.length === 0) return null
  // Prefer owner/office manager titles, otherwise take the first result
  const preferred = emails.find(e =>
    /owner|manager|director|founder|president|office|admin/i.test(e.position || '')
  ) || emails[0]
  return {
    email:    preferred.value,
    firstName: preferred.first_name || '',
    lastName:  preferred.last_name  || '',
    position:  preferred.position   || '',
  }
}

async function hunterVerify(email) {
  const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${HUNTER_KEY}`
  const { status, body } = await get(url)
  if (status !== 200) return 'unknown'
  return body.data?.result || 'unknown'  // deliverable | risky | undeliverable
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const raw  = fs.readFileSync(csvPath, 'utf8')
  const rows = parseCsv(raw)

  if (rows.length === 0) {
    console.error('Error: CSV has no data rows.')
    process.exit(1)
  }

  const inputHeaders = Object.keys(rows[0])
  const outputHeaders = [
    ...inputHeaders,
    'owner_name', 'owner_email', 'owner_title', 'email_status',
  ]

  // Counters for summary
  let emailsFound      = 0
  let emailsVerified   = 0
  let emailsDeliverable = 0
  let emailsGuessed    = 0

  console.log(`\nEnriching ${rows.length} leads...\n`)

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i]
    const domain = extractDomain(row.website)
    const label  = row.business_name || row.website || `Row ${i + 1}`

    // Defaults
    row.owner_name  = ''
    row.owner_email = ''
    row.owner_title = ''
    row.email_status = ''

    if (!domain) {
      console.log(`[${i + 1}/${rows.length}] ${label} — no website, skipping`)
      continue
    }

    // ── Domain search ──────────────────────────────────────────────────────
    process.stdout.write(`[${i + 1}/${rows.length}] ${label} (${domain}) — searching...`)
    await sleep(RATE_LIMIT_MS)

    let result = null
    try { result = await hunterDomainSearch(domain) } catch (e) {
      console.log(` error: ${e.message}`)
      continue
    }

    if (result) {
      emailsFound++
      const fullName = [result.firstName, result.lastName].filter(Boolean).join(' ')
      row.owner_name  = fullName
      row.owner_email = result.email
      row.owner_title = result.position

      // ── Verify email ───────────────────────────────────────────────────
      process.stdout.write(` found ${result.email} — verifying...`)
      await sleep(RATE_LIMIT_MS)

      let status = 'unknown'
      try { status = await hunterVerify(result.email) } catch { /* leave unknown */ }

      row.email_status = status
      emailsVerified++
      if (status === 'deliverable') emailsDeliverable++

      console.log(` ${status}`)

    } else {
      // ── Guess common patterns ──────────────────────────────────────────
      const guesses = GUESS_PATTERNS.map(p => `${p}@${domain}`)
      row.owner_email  = guesses.join(' | ')
      row.owner_name   = ''
      row.owner_title  = ''
      row.email_status = 'guessed'
      emailsGuessed++
      console.log(` no results — guessed: ${guesses[0]} (+${guesses.length - 1} variants)`)
    }
  }

  // ── Write output ───────────────────────────────────────────────────────────
  const outPath = path.join(path.dirname(csvPath), 'leads-enriched.csv')
  writeCsv(rows, outputHeaders, outPath)

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Enrichment complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total leads:         ${rows.length}
  Emails found:        ${emailsFound}
  Emails guessed:      ${emailsGuessed}
  Emails verified:     ${emailsVerified}
  Emails deliverable:  ${emailsDeliverable}
  Output:              ${outPath}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
}

main().catch(err => {
  console.error('\nFatal error:', err.message)
  process.exit(1)
})
