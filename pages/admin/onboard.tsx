import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import type { IntakeData, ServiceItem, FaqItem, DayHours } from '../api/generate-prompt'

// ── Constants ─────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { value: 'generic', label: 'Generic / General Business' },
  { value: 'dental', label: 'Dental Practice' },
  { value: 'restaurant', label: 'Restaurant / Bar' },
  { value: 'salon', label: 'Salon / Spa / Beauty' },
  { value: 'home_services', label: 'Home Services (Plumbing, HVAC, etc.)' },
  { value: 'legal', label: 'Law Firm / Legal Services' },
  { value: 'fitness', label: 'Gym / Fitness Studio' },
  { value: 'auto_repair', label: 'Auto Repair Shop' },
]

const TEMPLATE_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string; multiline?: boolean }>> = {
  dental: [
    { key: 'patient_types', label: 'Patient Types', placeholder: 'e.g. Adults and children of all ages' },
    { key: 'insurance_accepted', label: 'Insurance Plans Accepted', placeholder: 'e.g. Delta Dental, Cigna, MetLife, Aetna', multiline: true },
    { key: 'emergency_policy', label: 'Emergency / Same-Day Policy', placeholder: 'e.g. Same-day emergency appointments available when slots permit' },
  ],
  restaurant: [
    { key: 'cuisine_type', label: 'Cuisine Type', placeholder: 'e.g. Modern American, Italian, Mexican' },
    { key: 'seating_capacity', label: 'Seating Capacity', placeholder: 'e.g. 80 indoors, 30 on the patio' },
    { key: 'reservation_policy', label: 'Reservation Policy', placeholder: 'e.g. Recommended for dinner; walk-ins welcome for lunch and bar seating' },
    { key: 'private_dining', label: 'Private Dining / Events', placeholder: 'e.g. Private room for up to 30 guests available for events' },
  ],
  salon: [
    { key: 'salon_type', label: 'Salon Type', placeholder: 'e.g. Full-service hair salon, med spa, nail salon' },
    { key: 'specialties', label: 'Specialties', placeholder: 'e.g. Balayage, keratin treatments, extensions', multiline: true },
    { key: 'appointment_lead_time', label: 'Typical Appointment Lead Time', placeholder: 'e.g. Same-week availability for most services; color treatments book 1–2 weeks out' },
    { key: 'cancellation_policy', label: 'Cancellation Policy', placeholder: 'e.g. 24-hour notice required to avoid a cancellation fee' },
  ],
  home_services: [
    { key: 'home_service_type', label: 'Service Type', placeholder: 'e.g. Plumbing, HVAC, Electrical, Landscaping' },
    { key: 'service_area', label: 'Service Area', placeholder: 'e.g. Greater Denver metro area within 30 miles' },
    { key: 'license_info', label: 'Licensing & Insurance', placeholder: 'e.g. Licensed, bonded, and insured in the state of Colorado' },
    { key: 'emergency_availability', label: 'Emergency / After-Hours Availability', placeholder: 'e.g. 24/7 emergency service available for burst pipes and no-heat situations' },
  ],
  legal: [
    { key: 'practice_area', label: 'Practice Areas', placeholder: 'e.g. Personal injury, family law, criminal defense', multiline: true },
    { key: 'attorney_info', label: 'Attorney / Team Overview', placeholder: 'e.g. Our team of 5 attorneys has over 40 years of combined experience', multiline: true },
    { key: 'consultation_policy', label: 'Consultation Policy', placeholder: 'e.g. Free 30-minute initial consultations available by appointment' },
  ],
  fitness: [
    { key: 'fitness_type', label: 'Facility Type', placeholder: 'e.g. CrossFit gym, yoga studio, personal training studio' },
    { key: 'membership_options', label: 'Membership Options', placeholder: 'e.g. Month-to-month ($49/mo), 6-month ($39/mo), annual ($29/mo)', multiline: true },
    { key: 'class_types', label: 'Class Types / Programs', placeholder: 'e.g. HIIT, yoga, spin, strength training, bootcamp', multiline: true },
    { key: 'trial_policy', label: 'Free Trial / Guest Policy', placeholder: 'e.g. First class free for new members; guest passes available for $15' },
  ],
  auto_repair: [
    { key: 'certifications', label: 'Certifications & Specializations', placeholder: 'e.g. ASE-certified technicians, AAA-approved facility' },
    { key: 'vehicle_types', label: 'Vehicle Types Serviced', placeholder: 'e.g. All makes and models; specializing in European and Asian imports' },
    { key: 'warranty_policy', label: 'Warranty Policy', placeholder: 'e.g. 12-month / 12,000-mile warranty on all parts and labor' },
  ],
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}

const STEPS = [
  'Business Basics',
  'Template',
  'Hours',
  'Services',
  'FAQs',
  'Booking',
  'Escalation',
  'Review & Generate',
]

// ── Defaults ──────────────────────────────────────────────────────────────────

function defaultHours(): Record<string, DayHours> {
  const h: Record<string, DayHours> = {}
  DAYS.forEach((d) => {
    h[d] = { open: '9:00 AM', close: '5:00 PM', closed: d === 'sunday' }
  })
  return h
}

function defaultFaqs(): FaqItem[] {
  return Array.from({ length: 5 }, () => ({ question: '', answer: '' }))
}

const DEFAULT_DATA: IntakeData = {
  business_name: '',
  business_type: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  template_type: 'generic',
  template_fields: {},
  hours: defaultHours(),
  holiday_hours: '',
  services: [{ name: '', description: '', price: '' }],
  faqs: defaultFaqs(),
  booking_method: 'phone',
  booking_url: '',
  callback_timeframe: 'same day',
  escalation_message: "I'd like to connect you with a team member who can better assist you.",
  escalation_rules: '',
  transfer_instructions: '',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<IntakeData>(DEFAULT_DATA)
  const [generatedChat, setGeneratedChat] = useState('')
  const [generatedVoice, setGeneratedVoice] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activePromptTab, setActivePromptTab] = useState<'chat' | 'voice'>('chat')
  const [savedClientId, setSavedClientId] = useState<number | null>(null)

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function set<K extends keyof IntakeData>(field: K, value: IntakeData[K]) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  function setField(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    set(name as keyof IntakeData, value as never)
  }

  function setTemplateField(key: string, value: string) {
    setData((prev) => ({
      ...prev,
      template_fields: { ...prev.template_fields, [key]: value },
    }))
  }

  function setHours(day: string, field: keyof DayHours, value: string | boolean) {
    setData((prev) => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: { ...prev.hours[day], [field]: value },
      },
    }))
  }

  function addService() {
    set('services', [...data.services, { name: '', description: '', price: '' }])
  }
  function removeService(i: number) {
    set('services', data.services.filter((_, idx) => idx !== i))
  }
  function updateService(i: number, field: keyof ServiceItem, value: string) {
    const updated = [...data.services]
    updated[i] = { ...updated[i], [field]: value }
    set('services', updated)
  }

  function addFaq() {
    set('faqs', [...data.faqs, { question: '', answer: '' }])
  }
  function removeFaq(i: number) {
    set('faqs', data.faqs.filter((_, idx) => idx !== i))
  }
  function updateFaq(i: number, field: keyof FaqItem, value: string) {
    const updated = [...data.faqs]
    updated[i] = { ...updated[i], [field]: value }
    set('faqs', updated)
  }

  async function generatePrompts() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      setGeneratedChat(json.chat_prompt)
      setGeneratedVoice(json.voice_prompt)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  async function saveClient() {
    if (!generatedChat) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: data.business_name,
          business_type: data.business_type,
          template_type: data.template_type,
          system_prompt: generatedChat,
          custom_data: JSON.stringify({ ...data, voice_prompt: generatedVoice }),
          status: 'active',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')
      setSavedClientId(json.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setSaving(false)
    }
  }

  // ── Step renderers ───────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div>
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Business Basics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { name: 'business_name', label: 'Business Name *', placeholder: 'e.g. Bright Paws Pet Grooming' },
            { name: 'business_type', label: 'Business Type *', placeholder: 'e.g. Pet Grooming Salon' },
            { name: 'phone', label: 'Phone Number', placeholder: '(555) 000-0000' },
            { name: 'email', label: 'Email Address', placeholder: 'hello@yourbusiness.com' },
            { name: 'website', label: 'Website', placeholder: 'https://yourbusiness.com' },
          ].map((f) => (
            <div className="form-group" key={f.name}>
              <label>{f.label}</label>
              <input
                type="text"
                name={f.name}
                value={(data as unknown as Record<string, string>)[f.name]}
                onChange={setField}
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Address</label>
            <input
              type="text"
              name="address"
              value={data.address}
              onChange={setField}
              placeholder="123 Main St, City, State ZIP"
            />
          </div>
        </div>
      </div>
    )
  }

  function renderStep2() {
    const fields = TEMPLATE_FIELDS[data.template_type] ?? []
    return (
      <div>
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Template Selection</h3>
        <div className="form-group">
          <label>Template Type</label>
          <select
            value={data.template_type}
            onChange={(e) => set('template_type', e.target.value)}
          >
            {TEMPLATES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {fields.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                padding: '10px 14px',
                background: '#eef2ff',
                borderRadius: 6,
                fontSize: 12,
                color: '#4338ca',
                marginBottom: 16,
              }}
            >
              Fill in these fields to customize the <strong>{data.template_type}</strong> template.
            </div>
            {fields.map((f) => (
              <div className="form-group" key={f.key}>
                <label>{f.label}</label>
                {f.multiline ? (
                  <textarea
                    value={data.template_fields[f.key] ?? ''}
                    onChange={(e) => setTemplateField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={3}
                  />
                ) : (
                  <input
                    type="text"
                    value={data.template_fields[f.key] ?? ''}
                    onChange={(e) => setTemplateField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderStep3() {
    return (
      <div>
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Hours of Operation</h3>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr 1fr 80px',
              gap: 0,
              background: 'var(--bg)',
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--muted)',
            }}
          >
            <span>Day</span>
            <span>Opens</span>
            <span>Closes</span>
            <span>Closed</span>
          </div>
          {DAYS.map((day, i) => {
            const h = data.hours[day]
            return (
              <div
                key={day}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr 1fr 80px',
                  gap: 8,
                  padding: '8px 12px',
                  borderTop: i === 0 ? '1px solid var(--border)' : '1px solid var(--border)',
                  alignItems: 'center',
                  background: h?.closed ? '#fafafa' : 'white',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500 }}>{DAY_LABELS[day]}</span>
                <input
                  type="text"
                  value={h?.open ?? ''}
                  disabled={h?.closed}
                  onChange={(e) => setHours(day, 'open', e.target.value)}
                  placeholder="9:00 AM"
                  style={{ opacity: h?.closed ? 0.4 : 1 }}
                />
                <input
                  type="text"
                  value={h?.close ?? ''}
                  disabled={h?.closed}
                  onChange={(e) => setHours(day, 'close', e.target.value)}
                  placeholder="5:00 PM"
                  style={{ opacity: h?.closed ? 0.4 : 1 }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={h?.closed ?? false}
                    onChange={(e) => setHours(day, 'closed', e.target.checked)}
                  />
                  Closed
                </label>
              </div>
            )
          })}
        </div>

        <div className="form-group" style={{ marginTop: 20 }}>
          <label>Holiday Hours / Special Notes</label>
          <textarea
            name="holiday_hours"
            value={data.holiday_hours}
            onChange={setField}
            rows={3}
            placeholder="e.g. Closed Thanksgiving, Christmas Eve 9am–2pm, Christmas Day closed"
          />
        </div>
      </div>
    )
  }

  function renderStep4() {
    return (
      <div>
        <h3 style={{ marginBottom: 4, fontSize: 16, fontWeight: 600 }}>Services</h3>
        <p className="text-muted text-sm" style={{ marginBottom: 20 }}>
          List your key services. Price and description are optional.
        </p>

        {data.services.map((svc, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr 120px auto',
              gap: 10,
              marginBottom: 10,
              alignItems: 'start',
            }}
          >
            <div>
              {i === 0 && <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600 }}>Service Name</label>}
              <input
                type="text"
                value={svc.name}
                onChange={(e) => updateService(i, 'name', e.target.value)}
                placeholder="e.g. Full Groom"
              />
            </div>
            <div>
              {i === 0 && <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600 }}>Description</label>}
              <input
                type="text"
                value={svc.description}
                onChange={(e) => updateService(i, 'description', e.target.value)}
                placeholder="e.g. Bath, dry, haircut, nail trim & ear clean"
              />
            </div>
            <div>
              {i === 0 && <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600 }}>Price</label>}
              <input
                type="text"
                value={svc.price}
                onChange={(e) => updateService(i, 'price', e.target.value)}
                placeholder="e.g. from $45"
              />
            </div>
            <div style={{ paddingTop: i === 0 ? 24 : 0 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => removeService(i)}
                disabled={data.services.length === 1}
                style={{ color: 'var(--danger)' }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        <button type="button" className="btn btn-ghost btn-sm" onClick={addService} style={{ marginTop: 4 }}>
          + Add Service
        </button>
      </div>
    )
  }

  function renderStep5() {
    return (
      <div>
        <h3 style={{ marginBottom: 4, fontSize: 16, fontWeight: 600 }}>Frequently Asked Questions</h3>
        <p className="text-muted text-sm" style={{ marginBottom: 20 }}>
          Common questions and answers the AI should know. Leave blank pairs to skip them.
        </p>

        {data.faqs.map((faq, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '14px',
              marginBottom: 12,
              background: 'var(--surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>FAQ #{i + 1}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => removeFaq(i)}
                style={{ color: 'var(--danger)', padding: '2px 8px' }}
              >
                ✕ Remove
              </button>
            </div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label>Question</label>
              <input
                type="text"
                value={faq.question}
                onChange={(e) => updateFaq(i, 'question', e.target.value)}
                placeholder="e.g. Do you accept walk-ins?"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Answer</label>
              <textarea
                value={faq.answer}
                onChange={(e) => updateFaq(i, 'answer', e.target.value)}
                rows={2}
                placeholder="e.g. Yes! Walk-ins are welcome based on availability, but we recommend booking ahead."
              />
            </div>
          </div>
        ))}

        <button type="button" className="btn btn-ghost btn-sm" onClick={addFaq}>
          + Add FAQ
        </button>
      </div>
    )
  }

  function renderStep6() {
    return (
      <div>
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Booking & Appointments</h3>

        <div className="form-group">
          <label>How should the AI handle booking requests?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {[
              { value: 'online', label: 'Send to an online booking link', desc: 'Direct customers to a URL to book themselves' },
              { value: 'phone', label: 'Have them call the business', desc: 'Provide the phone number and encourage them to call' },
              { value: 'capture', label: 'Capture their info for a callback', desc: 'Collect name, phone, and preferred time to schedule later' },
            ].map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 14px',
                  border: `2px solid ${data.booking_method === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: data.booking_method === opt.value ? '#eef2ff' : 'white',
                }}
              >
                <input
                  type="radio"
                  name="booking_method"
                  value={opt.value}
                  checked={data.booking_method === opt.value}
                  onChange={setField}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {data.booking_method === 'online' && (
          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Booking URL</label>
            <input
              type="text"
              name="booking_url"
              value={data.booking_url}
              onChange={setField}
              placeholder="https://yourbusiness.com/book"
            />
          </div>
        )}

        <div className="form-group" style={{ marginTop: 16 }}>
          <label>Callback / Response Timeframe</label>
          <select
            name="callback_timeframe"
            value={data.callback_timeframe}
            onChange={setField}
          >
            <option value="">Not specified</option>
            <option value="within 1 hour">Within 1 hour</option>
            <option value="within 2 hours">Within 2 hours</option>
            <option value="same day">Same day</option>
            <option value="next business day">Next business day</option>
          </select>
        </div>
      </div>
    )
  }

  function renderStep7() {
    return (
      <div>
        <h3 style={{ marginBottom: 4, fontSize: 16, fontWeight: 600 }}>Escalation & Transfers</h3>
        <p className="text-muted text-sm" style={{ marginBottom: 20 }}>
          Define what the AI should say and do when it can't help.
        </p>

        <div className="form-group">
          <label>Escalation Message</label>
          <textarea
            name="escalation_message"
            value={data.escalation_message}
            onChange={setField}
            rows={2}
            placeholder="e.g. I'd like to connect you with a team member who can better help you with that."
          />
          <div className="text-muted text-sm" style={{ marginTop: 4 }}>
            This is the exact phrase the AI will say when escalating.
          </div>
        </div>

        <div className="form-group">
          <label>Escalation Triggers (optional)</label>
          <textarea
            name="escalation_rules"
            value={data.escalation_rules}
            onChange={setField}
            rows={3}
            placeholder="e.g. Escalate when: customer is upset or using angry language, customer asks to speak to a manager, issue involves billing or refunds"
          />
        </div>

        <div className="form-group">
          <label>Transfer Instructions (optional)</label>
          <textarea
            name="transfer_instructions"
            value={data.transfer_instructions}
            onChange={setField}
            rows={2}
            placeholder="e.g. Please hold while I connect you. Transferring you to our front desk team now."
          />
        </div>
      </div>
    )
  }

  function renderStep8() {
    const filledFaqs = data.faqs.filter((f) => f.question.trim() && f.answer.trim())
    const filledServices = data.services.filter((s) => s.name.trim())

    return (
      <div>
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Review & Generate</h3>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <SummaryCard title="Business">
            <Row label="Name" value={data.business_name} />
            <Row label="Type" value={data.business_type} />
            <Row label="Phone" value={data.phone} />
            <Row label="Address" value={data.address} />
          </SummaryCard>

          <SummaryCard title="Template">
            <Row label="Type" value={TEMPLATES.find((t) => t.value === data.template_type)?.label ?? data.template_type} />
            {Object.entries(data.template_fields).filter(([, v]) => v.trim()).slice(0, 3).map(([k, v]) => (
              <Row key={k} label={k.replace(/_/g, ' ')} value={v.slice(0, 60) + (v.length > 60 ? '…' : '')} />
            ))}
          </SummaryCard>

          <SummaryCard title="Hours">
            {DAYS.slice(0, 5).map((day) => {
              const h = data.hours[day]
              return <Row key={day} label={DAY_LABELS[day]} value={h?.closed ? 'Closed' : `${h?.open} – ${h?.close}`} />
            })}
          </SummaryCard>

          <SummaryCard title="Content">
            <Row label="Services" value={`${filledServices.length} configured`} />
            <Row label="FAQs" value={`${filledFaqs.length} configured`} />
            <Row label="Booking" value={data.booking_method === 'online' ? 'Online link' : data.booking_method === 'phone' ? 'Phone call' : 'Capture info'} />
            <Row label="Callback" value={data.callback_timeframe || '—'} />
          </SummaryCard>
        </div>

        {/* Generate button */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={generatePrompts}
            disabled={generating || !data.business_name.trim()}
          >
            {generating ? 'Generating…' : generatedChat ? '↺ Regenerate Prompt' : '✦ Generate System Prompt'}
          </button>
          {generatedChat && (
            <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ Prompts generated</span>
          )}
        </div>

        {/* Preview */}
        {generatedChat && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
              {(['chat', 'voice'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActivePromptTab(tab)}
                  style={{
                    padding: '8px 18px',
                    border: 'none',
                    borderBottom: activePromptTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: activePromptTab === tab ? 600 : 400,
                    color: activePromptTab === tab ? 'var(--primary)' : 'var(--muted)',
                    fontSize: 13,
                  }}
                >
                  {tab === 'chat' ? '💬 Chat Prompt' : '🎙 Voice Prompt'}
                </button>
              ))}
            </div>
            <textarea
              readOnly
              value={activePromptTab === 'chat' ? generatedChat : generatedVoice}
              style={{
                width: '100%',
                height: 280,
                padding: 12,
                fontFamily: 'monospace',
                fontSize: 11.5,
                lineHeight: 1.6,
                border: '1px solid var(--border)',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                resize: 'vertical',
                background: '#fafafa',
              }}
            />
          </div>
        )}

        {savedClientId && (
          <div
            style={{
              marginTop: 24,
              padding: 20,
              background: '#f0fff4',
              border: '1px solid #9ae6b4',
              borderRadius: 10,
            }}
          >
            <div style={{ fontWeight: 700, color: '#276749', fontSize: 15, marginBottom: 8 }}>
              ✓ Client saved! Here is the embed code:
            </div>
            <pre
              className="font-mono"
              style={{
                background: '#1e1b4b',
                color: '#e2e8f0',
                padding: '12px 16px',
                borderRadius: 8,
                fontSize: 12.5,
                overflowX: 'auto',
                userSelect: 'all',
                marginBottom: 12,
              }}
            >
{`<script src="https://nexusforge.vip/widget.js" data-client-id="${savedClientId}"></script>`}
            </pre>
            <div style={{ display: 'flex', gap: 10 }}>
              <a href={`/admin/clients/${savedClientId}`}>
                <button className="btn btn-primary btn-sm">Edit Client →</button>
              </a>
              <a href={`/test.html?clientId=${savedClientId}`} target="_blank" rel="noreferrer">
                <button className="btn btn-ghost btn-sm">Preview Demo ↗</button>
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Layout helpers ───────────────────────────────────────────────────────────

  const stepRenderers = [
    renderStep1, renderStep2, renderStep3, renderStep4,
    renderStep5, renderStep6, renderStep7, renderStep8,
  ]

  const canNext = step < STEPS.length - 1
  const canBack = step > 0

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin">
          <button className="btn btn-ghost btn-sm">← Back</button>
        </Link>
        <h2 className="page-title" style={{ margin: 0 }}>Onboard New Client</h2>
      </div>

      {/* Stepper */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          marginBottom: 28,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {STEPS.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setStep(i)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: i === step ? 'var(--primary)' : i < step ? '#c7d2fe' : 'var(--border)',
                  color: i === step ? '#fff' : i < step ? '#4338ca' : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  transition: 'background .2s',
                }}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: i === step ? 700 : 400,
                  color: i === step ? 'var(--primary)' : 'var(--muted)',
                  whiteSpace: 'nowrap',
                  maxWidth: 64,
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 24,
                  height: 2,
                  background: i < step ? '#c7d2fe' : 'var(--border)',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '10px 14px',
            background: '#fff5f5',
            border: '1px solid #fed7d7',
            borderRadius: 8,
            color: '#c53030',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="card">
        <div className="card-body">{stepRenderers[step]()}</div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setStep((s) => s - 1)}
          disabled={!canBack}
        >
          ← Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setStep((s) => s + 1)}
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={saveClient}
            disabled={!generatedChat || saving}
            style={{ minWidth: 160 }}
          >
            {saving ? 'Saving…' : '✓ Generate & Save Client'}
          </button>
        )}
      </div>
    </AdminLayout>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-header" style={{ padding: '10px 14px', fontSize: 13 }}>{title}</div>
      <div className="card-body" style={{ padding: '10px 14px' }}>{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12 }}>
      <span style={{ color: 'var(--muted)', minWidth: 70, textTransform: 'capitalize' }}>{label}:</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}
