import Link from 'next/link'
import { useRouter } from 'next/router'
import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { pathname } = useRouter()

  const links = [
    { href: '/admin', label: 'Clients' },
    { href: '/admin/onboard', label: 'Onboard Client' },
    { href: '/admin/conversations', label: 'Conversations' },
  ]

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
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
