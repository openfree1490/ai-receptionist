import type { NextApiRequest, NextApiResponse } from 'next'
import db, { type ConversationRow } from '@/lib/db'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { client_id } = req.query

  const rows = client_id
    ? (db
        .prepare('SELECT * FROM conversations WHERE client_id = ? ORDER BY created_at DESC')
        .all(Number(client_id)) as ConversationRow[])
    : (db
        .prepare('SELECT * FROM conversations ORDER BY created_at DESC')
        .all() as ConversationRow[])

  return res.status(200).json(rows)
}
