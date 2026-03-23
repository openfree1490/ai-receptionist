import type { NextApiRequest, NextApiResponse } from 'next'

const COOKIE_NAME = 'admin_auth'
const MAX_AGE     = 60 * 60 * 24  // 24 hours in seconds

function buildCookie(value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handleLogin(req, res)
  }
  if (req.method === 'DELETE') {
    return handleLogout(res)
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

function handleLogin(req: NextApiRequest, res: NextApiResponse) {
  const { password } = req.body as { password?: string }
  const expected = process.env.ADMIN_PASSWORD

  if (!expected) {
    return res.status(503).json({ error: 'Admin password not configured on server' })
  }

  if (!password || password !== expected) {
    return res.status(401).json({ error: 'Incorrect password' })
  }

  res.setHeader('Set-Cookie', buildCookie(expected, MAX_AGE))
  return res.status(200).json({ ok: true })
}

function handleLogout(res: NextApiResponse) {
  res.setHeader('Set-Cookie', buildCookie('', 0))
  return res.status(200).json({ ok: true })
}
