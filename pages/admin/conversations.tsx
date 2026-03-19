import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'

interface Client {
  id: number
  business_name: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Conversation {
  id: number
  client_id: number
  channel: string
  messages: string
  caller_name: string | null
  caller_phone: string | null
  created_at: string
}

export default function Conversations() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then(setClients)
  }, [])

  useEffect(() => {
    setLoading(true)
    const qs = selectedClient ? `?client_id=${selectedClient}` : ''
    fetch(`/api/conversations${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setConversations(data)
        setActiveConv(null)
        setLoading(false)
      })
  }, [selectedClient])

  function getMessages(conv: Conversation): Message[] {
    try {
      return JSON.parse(conv.messages)
    } catch {
      return []
    }
  }

  return (
    <AdminLayout>
      <h2 className="page-title">Conversations</h2>

      <div className="form-group" style={{ maxWidth: 320 }}>
        <label>Filter by client</label>
        <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.business_name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
        {/* List */}
        <div className="card">
          <div className="card-header">
            {loading ? 'Loading…' : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
          </div>
          {conversations.length === 0 && !loading ? (
            <div className="card-body text-muted">No conversations yet.</div>
          ) : (
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {conversations.map((conv) => {
                const msgs = getMessages(conv)
                const preview = msgs.find((m) => m.role === 'user')?.content ?? '(empty)'
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: activeConv?.id === conv.id ? '#eef2ff' : 'transparent',
                    }}
                  >
                    <div style={{ fontWeight: 500, fontSize: 13 }}>
                      #{conv.id} — {clients.find((c) => c.id === conv.client_id)?.business_name ?? `Client ${conv.client_id}`}
                    </div>
                    <div className="text-muted text-sm" style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {preview.slice(0, 60)}
                    </div>
                    <div className="text-muted text-sm">{new Date(conv.created_at).toLocaleString()}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="card">
          {!activeConv ? (
            <div className="card-body text-muted">Select a conversation to view.</div>
          ) : (
            <>
              <div className="card-header flex items-center justify-between">
                <span>Conversation #{activeConv.id}</span>
                <span className="text-muted text-sm">{new Date(activeConv.created_at).toLocaleString()}</span>
              </div>
              <div className="card-body" style={{ maxHeight: 560, overflowY: 'auto' }}>
                {getMessages(activeConv).map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 12,
                      display: 'flex',
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '75%',
                        padding: '8px 12px',
                        borderRadius: 12,
                        background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg)',
                        color: msg.role === 'user' ? '#fff' : 'var(--text)',
                        border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                        fontSize: 13,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
