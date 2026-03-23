import Link from 'next/link'
import { useRouter } from 'next/router'
import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { pathname } = router

  const links = [
    { href: '/admin', label: 'Clients' },
    { href: '/admin/onboard', label: 'Onboard Client' },
    { href: '/admin/conversations', label: 'Conversations' },
    { href: '/admin/analytics', label: 'Analytics' },
  ]

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>AI Receptionist</h1>
        <nav>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? 'active' : ''}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          style={{
            marginTop: 'auto',
            width: '100%',
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 8,
            color: 'rgba(255,255,255,.5)',
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
