import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import ClientForm, { type ClientFormData } from '@/components/ClientForm'

export default function EditClient() {
  const router = useRouter()
  const { id } = router.query
  const [initial, setInitial] = useState<ClientFormData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((data) => {
        let parsedCustom: Record<string, unknown> = {}
        try {
          parsedCustom = JSON.parse(data.custom_data ?? '{}')
        } catch { /* leave empty */ }

        setInitial({
          business_name: data.business_name,
          business_type: data.business_type,
          template_type: data.template_type,
          custom_data: typeof data.custom_data === 'string'
            ? data.custom_data
            : JSON.stringify(data.custom_data, null, 2),
          system_prompt: data.system_prompt,
          voice_prompt: (parsedCustom.voice_prompt as string) ?? '',
          retell_agent_id: data.retell_agent_id ?? '',
          status: data.status,
          brand_color: data.brand_color || '#4f46e5',
          greeting: data.greeting || 'Chat with us',
        })
      })
  }, [id])

  async function handleSubmit(data: ClientFormData) {
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      // Persist voice_prompt inside custom_data JSON
      let customObj: Record<string, unknown> = {}
      try { customObj = JSON.parse(data.custom_data) } catch { /* ignore */ }
      const mergedCustomData = JSON.stringify({ ...customObj, voice_prompt: data.voice_prompt })

      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, custom_data: mergedCustomData, brand_color: data.brand_color, greeting: data.greeting }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Failed to update client')
      }
      setSuccess(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin">
          <button className="btn btn-ghost btn-sm">← Back</button>
        </Link>
        <h2 className="page-title" style={{ margin: 0 }}>Edit Client #{id}</h2>
      </div>

      {error && (
        <div
          className="card-body mb-4"
          style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, color: '#c53030' }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="card-body mb-4"
          style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 8, color: '#276749' }}
        >
          Saved successfully.
        </div>
      )}

      {initial && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">Embed Code</div>
          <div className="card-body">
            <p className="text-muted text-sm" style={{ marginBottom: 10 }}>
              Add this snippet just before the closing <code>&lt;/body&gt;</code> tag on your client's website.
            </p>
            <pre
              className="font-mono"
              style={{
                background: '#1e1b4b',
                color: '#e2e8f0',
                padding: '14px 16px',
                borderRadius: 8,
                fontSize: 12.5,
                overflowX: 'auto',
                whiteSpace: 'pre',
                userSelect: 'all',
              }}
            >
{`<script src="https://nexusforge.vip/widget.js" data-client-id="${id}"></script>`}
            </pre>
          </div>
        </div>
      )}

      {initial ? (
        <ClientForm initialData={initial} onSubmit={handleSubmit} saving={saving} />
      ) : (
        <div className="text-muted">Loading…</div>
      )}
    </AdminLayout>
  )
}
