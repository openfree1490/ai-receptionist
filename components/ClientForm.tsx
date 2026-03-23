import { useState } from 'react'

export interface ClientFormData {
  business_name: string
  business_type: string
  template_type: string
  custom_data: string
  system_prompt: string
  voice_prompt: string
  retell_agent_id: string
  status: 'active' | 'inactive'
  brand_color: string
  greeting: string
}

interface Props {
  initialData?: ClientFormData
  onSubmit: (data: ClientFormData) => void
  saving: boolean
}

const defaults: ClientFormData = {
  business_name: '',
  business_type: '',
  template_type: 'general',
  custom_data: '{}',
  system_prompt: '',
  voice_prompt: '',
  retell_agent_id: '',
  status: 'active',
  brand_color: '#4f46e5',
  greeting: 'Chat with us',
}

const TEMPLATES = ['general', 'pet_groomer', 'dental', 'restaurant', 'medical', 'salon']

export default function ClientForm({ initialData, onSubmit, saving }: Props) {
  const [form, setForm] = useState<ClientFormData>(initialData ?? defaults)
  const [promptTab, setPromptTab] = useState<'chat' | 'voice'>('chat')

  function set(field: keyof ClientFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <div className="card-header">Business Details</div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>Business Name *</label>
              <input type="text" value={form.business_name} onChange={set('business_name')} required placeholder="e.g. Bright Paws" />
            </div>
            <div className="form-group">
              <label>Business Type *</label>
              <input type="text" value={form.business_type} onChange={set('business_type')} required placeholder="e.g. Pet Grooming" />
            </div>
            <div className="form-group">
              <label>Template</label>
              <select value={form.template_type} onChange={set('template_type')}>
                {TEMPLATES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Retell Agent ID (optional)</label>
            <input type="text" value={form.retell_agent_id} onChange={set('retell_agent_id')} placeholder="agent_..." />
          </div>
          <div className="form-group">
            <label>Widget Greeting</label>
            <input type="text" value={form.greeting} onChange={set('greeting')} placeholder="Chat with us" />
          </div>
          <div className="form-group">
            <label>Brand Color</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="color"
                value={form.brand_color}
                onChange={set('brand_color')}
                style={{ width: 44, height: 36, padding: 2, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
              />
              <input
                type="text"
                value={form.brand_color}
                onChange={set('brand_color')}
                placeholder="#4f46e5"
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">AI Configuration</div>
        <div className="card-body">
          <div className="form-group">
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
              {(['chat', 'voice'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPromptTab(tab)}
                  style={{
                    padding: '7px 16px',
                    border: 'none',
                    borderBottom: promptTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: promptTab === tab ? 600 : 400,
                    color: promptTab === tab ? 'var(--primary)' : 'var(--muted)',
                    fontSize: 13,
                    marginBottom: -1,
                  }}
                >
                  {tab === 'chat' ? '💬 Chat Prompt' : '🎙 Voice Prompt'}
                </button>
              ))}
            </div>
            {promptTab === 'chat' ? (
              <textarea
                value={form.system_prompt}
                onChange={set('system_prompt')}
                rows={12}
                placeholder="You are a friendly receptionist for..."
                style={{ borderTop: 'none', borderRadius: '0 0 6px 6px' }}
              />
            ) : (
              <textarea
                value={form.voice_prompt}
                onChange={set('voice_prompt')}
                rows={12}
                placeholder="You are a voice AI receptionist for... (shorter responses, no URLs, phone-optimized)"
                style={{ borderTop: 'none', borderRadius: '0 0 6px 6px' }}
              />
            )}
          </div>
          <div className="form-group">
            <label>Custom Data (JSON)</label>
            <textarea
              value={form.custom_data}
              onChange={set('custom_data')}
              rows={4}
              className="font-mono"
              placeholder='{"hours": "Mon-Fri 9am-5pm"}'
              style={{ fontSize: 12 }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Client'}
        </button>
      </div>
    </form>
  )
}
