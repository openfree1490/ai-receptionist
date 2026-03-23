import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'

interface ClientStat {
  id: number
  business_name: string
  total_conversations: number
  voice_conversations: number
  chat_conversations: number
}

interface DayStat { date: string; count: number }

interface AnalyticsData {
  clients: ClientStat[]
  daily_conversations: DayStat[]
  total_leads: number
  recent_leads: DayStat[]
  total_conversations: number
  total_messages: number
}

function MiniBarChart({ data, color = '#4f46e5', height = 60 }: {
  data: DayStat[]; color?: string; height?: number
}) {
  if (!data.length) return <div style={{ color: '#94a3b8', fontSize: 12 }}>No data yet</div>
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${d.count}`}
          style={{
            flex: 1,
            height: `${Math.max((d.count / max) * 100, 4)}%`,
            background: color,
            borderRadius: '3px 3px 0 0',
            opacity: 0.85,
            minWidth: 6,
          }}
        />
      ))}
    </div>
  )
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <AdminLayout><div className="text-muted">Loading…</div></AdminLayout>
  if (!data)   return <AdminLayout><div className="text-muted">Error loading analytics.</div></AdminLayout>

  const maxConvs = Math.max(...data.clients.map((c) => c.total_conversations), 1)

  return (
    <AdminLayout>
      <h2 className="page-title">Analytics</h2>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Conversations', value: data.total_conversations, icon: '💬', color: '#4f46e5' },
          { label: 'Total Messages',      value: data.total_messages,      icon: '✉️',  color: '#0ea5e9' },
          { label: 'Total Leads',         value: data.total_leads,         icon: '🎯', color: '#10b981' },
        ].map((kpi) => (
          <div key={kpi.label} className="card">
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: kpi.color + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>{kpi.icon}</div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: '#718096' }}>{kpi.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">Conversations — Last 14 Days</div>
          <div className="card-body">
            <MiniBarChart data={data.daily_conversations} color="#4f46e5" height={80} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#718096' }}>
              <span>{data.daily_conversations[0]?.date ?? ''}</span>
              <span>{data.daily_conversations[data.daily_conversations.length - 1]?.date ?? ''}</span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">New Leads — Last 14 Days</div>
          <div className="card-body">
            <MiniBarChart data={data.recent_leads} color="#10b981" height={80} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#718096' }}>
              <span>{data.recent_leads[0]?.date ?? ''}</span>
              <span>{data.recent_leads[data.recent_leads.length - 1]?.date ?? ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-client table */}
      <div className="card">
        <div className="card-header">Conversations by Client</div>
        {data.clients.length === 0 ? (
          <div className="card-body text-muted">No data yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Total</th>
                <th>Chat</th>
                <th>Voice</th>
                <th style={{ width: 200 }}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {data.clients.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.business_name}</td>
                  <td>{c.total_conversations}</td>
                  <td>{c.chat_conversations}</td>
                  <td>{c.voice_conversations}</td>
                  <td>
                    <div style={{ background: '#e2e8f0', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(c.total_conversations / maxConvs) * 100}%`,
                        background: '#4f46e5',
                        borderRadius: 4,
                        minWidth: c.total_conversations > 0 ? 4 : 0,
                      }} />
                    </div>
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
