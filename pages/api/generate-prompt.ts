import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DayHours {
  open: string
  close: string
  closed: boolean
}

export interface ServiceItem {
  name: string
  description: string
  price: string
}

export interface FaqItem {
  question: string
  answer: string
}

export interface IntakeData {
  // Step 1
  business_name: string
  business_type: string
  address: string
  phone: string
  email: string
  website: string
  // Step 2
  template_type: string
  template_fields: Record<string, string>
  // Step 3
  hours: Record<string, DayHours>
  holiday_hours: string
  // Step 4
  services: ServiceItem[]
  // Step 5
  faqs: FaqItem[]
  // Step 6
  booking_method: 'online' | 'phone' | 'capture'
  booking_url: string
  callback_timeframe: string
  // Step 7
  escalation_message: string
  escalation_rules: string
  transfer_instructions: string
}

// ── Formatters ────────────────────────────────────────────────────────────────

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}

function formatHours(hours: IntakeData['hours']): string {
  return DAY_ORDER.map((day) => {
    const h = hours?.[day]
    if (!h || h.closed) return `${DAY_LABELS[day]}: Closed`
    const open = h.open || '?'
    const close = h.close || '?'
    return `${DAY_LABELS[day]}: ${open} – ${close}`
  }).join('\n')
}

function formatServices(services: ServiceItem[]): string {
  const valid = services?.filter((s) => s.name?.trim())
  if (!valid?.length) return 'Contact us for a full list of services and pricing.'
  return valid
    .map((s, i) => {
      let line = `${i + 1}. **${s.name}**`
      if (s.description?.trim()) line += ` — ${s.description}`
      if (s.price?.trim()) line += ` (${s.price})`
      return line
    })
    .join('\n')
}

function formatFAQs(faqs: FaqItem[]): string {
  const valid = faqs?.filter((f) => f.question?.trim() && f.answer?.trim())
  if (!valid?.length) return '(No FAQs configured.)'
  return valid.map((f) => `**Q: ${f.question}**\nA: ${f.answer}`).join('\n\n')
}

function formatBooking(data: IntakeData): string {
  const cb = data.callback_timeframe
    ? ` We aim to respond within ${data.callback_timeframe}.`
    : ''
  switch (data.booking_method) {
    case 'online':
      return `Appointments can be booked online at ${data.booking_url || data.website}.${cb}`
    case 'phone':
      return `To schedule an appointment, please call us at ${data.phone}.${cb}`
    case 'capture':
      return `To schedule an appointment, ask the customer for their name, phone number, preferred date/time, and reason for the visit. Let them know someone will follow up to confirm.${cb}`
    default:
      return `Contact us at ${data.phone} to schedule an appointment.`
  }
}

// ── Template engine ───────────────────────────────────────────────────────────

function loadTemplate(templateType: string): string {
  const dir = path.join(process.cwd(), 'templates')
  const target = path.join(dir, `${templateType}.txt`)
  const fallback = path.join(dir, 'generic.txt')
  try {
    return fs.readFileSync(target, 'utf-8')
  } catch {
    return fs.readFileSync(fallback, 'utf-8')
  }
}

function buildReplacements(data: IntakeData): Record<string, string> {
  const hoursText = formatHours(data.hours)
  const holidaySection = data.holiday_hours?.trim()
    ? `**Holiday Hours:**\n${data.holiday_hours}`
    : ''
  const escalationRulesSection = data.escalation_rules?.trim()
    ? `**Escalation Triggers:**\n${data.escalation_rules}`
    : ''
  const transferSection = data.transfer_instructions?.trim()
    ? `**Transfer Instructions:** ${data.transfer_instructions}`
    : ''

  const base: Record<string, string> = {
    '{BUSINESS_NAME}': data.business_name ?? '',
    '{BUSINESS_TYPE}': data.business_type ?? '',
    '{ADDRESS}': data.address ?? '',
    '{PHONE}': data.phone ?? '',
    '{EMAIL}': data.email ?? '',
    '{WEBSITE}': data.website ?? '',
    '{HOURS_SCHEDULE}': hoursText,
    '{HOLIDAY_HOURS_SECTION}': holidaySection,
    '{HOLIDAY_HOURS}': data.holiday_hours ?? '',
    '{SERVICES_LIST}': formatServices(data.services),
    '{FAQS_SECTION}': formatFAQs(data.faqs),
    '{BOOKING_INSTRUCTIONS}': formatBooking(data),
    '{ESCALATION_MESSAGE}': data.escalation_message || 'Let me connect you with a team member who can better assist you.',
    '{ESCALATION_RULES_SECTION}': escalationRulesSection,
    '{TRANSFER_INSTRUCTIONS_SECTION}': transferSection,
  }

  // Inject template-specific fields
  for (const [key, val] of Object.entries(data.template_fields ?? {})) {
    base[`{${key.toUpperCase()}}`] = val ?? ''
  }

  return base
}

function applyReplacements(template: string, replacements: Record<string, string>): string {
  let result = template
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.split(placeholder).join(value)
  }
  return result
}

// ── Voice prompt ──────────────────────────────────────────────────────────────

function buildVoicePrompt(chatPrompt: string, data: IntakeData): string {
  const transferLine = data.transfer_instructions?.trim()
    ? `When transferring a caller, say: "${data.transfer_instructions}"`
    : `When transferring a caller, say: "Please hold while I connect you with a team member."`

  const voiceHeader = `You are a voice AI receptionist for ${data.business_name}, speaking with a caller on the phone. Be warm, concise, and professional.

## Voice-Specific Rules
- Keep every response to 1–3 sentences unless more detail is clearly needed
- Never read URLs aloud — say "visit our website" or "I can send you the link by text"
- When giving phone numbers, read each digit clearly
- Do not use markdown, bullet points, or numbered lists in your spoken responses
- Use natural conversational language — contractions are fine
- ${transferLine}
- If the caller seems confused, slow down and offer to repeat

---

`
  return voiceHeader + chatPrompt
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const data = req.body as IntakeData

  if (!data.business_name?.trim()) {
    return res.status(400).json({ error: 'business_name is required' })
  }

  try {
    const template = loadTemplate(data.template_type || 'generic')
    const replacements = buildReplacements(data)
    const chatPrompt = applyReplacements(template, replacements)
    const voicePrompt = buildVoicePrompt(chatPrompt, data)

    return res.status(200).json({ chat_prompt: chatPrompt, voice_prompt: voicePrompt })
  } catch (err) {
    console.error('generate-prompt error:', err)
    return res.status(500).json({ error: 'Failed to generate prompt' })
  }
}
