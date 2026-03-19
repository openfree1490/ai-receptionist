import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'

interface Client {
  id: number
  business_name: string
  business_type: string
  template_type: string
  status: 'active' | 'inactive'
  created_at: string
}

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => {
        setClients(data)
        setLoading(false)
      })
  }, [])

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="page-title" style={{ margin: 0 }}>Clients</h2>
        <div className="flex gap-2">
          <Link href="/admin/onboard">
            <button className="btn btn-primary">✦ Onboard New Client</button>
          </Link>
          <Link href="/admin/clients/new">
            <button className="btn btn-ghost">+ Quick Add</button>
          </Link>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="card-body text-muted">Loading…</div>
        ) : clients.length === 0 ? (
          <div className="card-body text-muted">
            No clients yet.{' '}
            <Link href="/admin/clients/new">Add one</Link> or run{' '}
            <code className="font-mono">npm run seed</code>.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Business</th>
                <th>Type</th>
                <th>Template</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.business_name}</td>
                  <td>{c.business_type}</td>
                  <td>{c.template_type}</td>
                  <td>
                    <span className={`badge badge-${c.status}`}>{c.status}</span>
                  </td>
                  <td className="text-muted text-sm">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <Link href={`/admin/clients/${c.id}`}>
                      <button className="btn btn-ghost btn-sm">Edit</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  )
}
