import type { NextApiRequest, NextApiResponse } from 'next'
import db from '@/lib/db'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, phone, business_type, message } = req.body as {
    name?: string
    email?: string
    phone?: string
    business_type?: string
    message?: string
  }

  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Name and email are required' })
  }

  const result = db
    .prepare(
      'INSERT INTO leads (name, email, phone, business_type, message) VALUES (?, ?, ?, ?, ?)',
    )
    .run(
      name.trim(),
      email.trim(),
      phone?.trim() || null,
      business_type?.trim() || null,
      message?.trim() || null,
    )

  return res.status(201).json({ id: result.lastInsertRowid })
}
