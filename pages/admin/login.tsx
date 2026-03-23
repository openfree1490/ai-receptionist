import { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function AdminLogin() {
  const router = useRouter()
  const next   = (router.query.next as string) || '/admin'

  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      })

      if (res.ok) {
        router.replace(next)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Incorrect password')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Admin Login — AI Receptionist</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0c29',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <div style={{
          background: '#1e1b4b',
          border: '1px solid #4f46e5',
          borderRadius: 16,
          padding: '40px 36px',
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 8px 32px rgba(0,0,0,.4)',
        }}>
          {/* Logo / brand */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
            <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>
              AI Receptionist
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>
              Admin Panel
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', marginBottom: 6, color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0f0c29',
                border: `1px solid ${error ? '#ef4444' : '#4f46e5'}`,
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 15,
                outline: 'none',
                marginBottom: error ? 8 : 20,
              }}
            />

            {error && (
              <p style={{
                color: '#f87171',
                fontSize: 13,
                marginBottom: 16,
                padding: '8px 12px',
                background: 'rgba(239,68,68,.1)',
                borderRadius: 6,
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: '100%',
                padding: '11px',
                background: loading ? '#4338ca' : '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: !password ? 0.6 : 1,
                transition: 'background .15s',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 24 }}>
            nexusforge.vip
          </p>
        </div>
      </div>
    </>
  )
}
