import type { NextApiRequest, NextApiResponse } from 'next'
import db from '@/lib/db'
import nodemailer from 'nodemailer'

interface LeadData {
  name:          string
  email:         string
  phone?:        string
  business_type?: string
  message?:      string
}

// ── Email notification ────────────────────────────────────────────────────────

async function sendLeadEmail(lead: LeadData & { id: number | bigint }) {
  const {
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
    SMTP_FROM, LEAD_NOTIFY_EMAIL,
  } = process.env

  if (!SMTP_HOST || !LEAD_NOTIFY_EMAIL) return   // not configured — skip silently

  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth:   SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  })

  const subject = `New Lead: ${lead.name}${lead.business_type ? ` (${lead.business_type})` : ''}`
  const text = [
    `New lead captured via Nexus Forge AI`,
    ``,
    `Name:          ${lead.name}`,
    `Email:         ${lead.email}`,
    `Phone:         ${lead.phone || '—'}`,
    `Business Type: ${lead.business_type || '—'}`,
    `Message:       ${lead.message || '—'}`,
    ``,
    `Lead ID: ${lead.id}`,
    `Captured at: ${new Date().toLocaleString()}`,
  ].join('\n')

  await transporter.sendMail({
    from:    SMTP_FROM || SMTP_USER || 'noreply@nexusforge.vip',
    to:      LEAD_NOTIFY_EMAIL,
    subject,
    text,
  })
}

// ── Webhook notification ──────────────────────────────────────────────────────

async function sendWebhook(lead: LeadData & { id: number | bigint }) {
  const url = process.env.WEBHOOK_URL
  if (!url) return   // not configured — skip silently

  await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      event:         'lead.created',
      id:            lead.id,
      name:          lead.name,
      email:         lead.email,
      phone:         lead.phone  || null,
      business_type: lead.business_type || null,
      message:       lead.message || null,
      created_at:    new Date().toISOString(),
    }),
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, phone, business_type, message } = req.body as {
    name?: string
    email?: string
    phone?: string
    business_type?: string
    message?: string
  }

  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Name and email are required' })
  }

  const result = db
    .prepare(
      'INSERT INTO leads (name, email, phone, business_type, message) VALUES (?, ?, ?, ?, ?)',
    )
    .run(
      name.trim(),
      email.trim(),
      phone?.trim() || null,
      business_type?.trim() || null,
      message?.trim() || null,
    )

  const lead: LeadData & { id: number | bigint } = {
    id:            result.lastInsertRowid,
    name:          name.trim(),
    email:         email.trim(),
    phone:         phone?.trim(),
    business_type: business_type?.trim(),
    message:       message?.trim(),
  }

  // Fire-and-forget notifications (don't fail the request if these error)
  Promise.all([
    sendLeadEmail(lead).catch((e) => console.error('[leads] email error:', e)),
    sendWebhook(lead).catch((e)  => console.error('[leads] webhook error:', e)),
  ])

  return res.status(201).json({ id: result.lastInsertRowid })
}
