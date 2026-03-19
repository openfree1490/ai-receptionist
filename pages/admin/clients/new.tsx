import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import ClientForm, { type ClientFormData } from '@/components/ClientForm'

export default function NewClient() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(data: ClientFormData) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Failed to create client')
      }
      router.push('/admin')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin">
          <button className="btn btn-ghost btn-sm">← Back</button>
        </Link>
        <h2 className="page-title" style={{ margin: 0 }}>New Client</h2>
      </div>
      {error && (
        <div
          className="card-body mb-4"
          style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, color: '#c53030' }}
        >
          {error}
        </div>
      )}
      <ClientForm onSubmit={handleSubmit} saving={saving} />
    </AdminLayout>
  )
}
