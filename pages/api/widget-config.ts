import type { NextApiRequest, NextApiResponse } from 'next'
import db from '@/lib/db'

// Public endpoint — no auth required. Returns widget display config for a client.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const clientId = Number(req.query.clientId)
  if (isNaN(clientId)) return res.status(400).json({ error: 'clientId required' })

  const row = db
    .prepare('SELECT brand_color, greeting FROM clients WHERE id = ? AND status = ?')
    .get(clientId, 'active') as { brand_color: string; greeting: string } | undefined

  // Allow widget.js to cache this for 5 minutes
  res.setHeader('Cache-Control', 'public, max-age=300')
  return res.status(200).json({
    brand_color: row?.brand_color || '#4f46e5',
    greeting:    row?.greeting    || 'Chat with us',
  })
}
