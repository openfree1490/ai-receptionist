import type { NextApiRequest, NextApiResponse } from 'next'
import db, { type ClientRow } from '@/lib/db'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const clients = db
      .prepare('SELECT * FROM clients ORDER BY created_at DESC')
      .all() as ClientRow[]
    return res.status(200).json(clients)
  }

  if (req.method === 'POST') {
    const {
      business_name,
      business_type,
      template_type = 'general',
      custom_data = {},
      system_prompt = '',
      retell_agent_id,
      status = 'active',
    } = req.body as Partial<ClientRow>

    if (!business_name || !business_type) {
      return res.status(400).json({ error: 'business_name and business_type are required' })
    }

    const result = db
      .prepare(
        `INSERT INTO clients
           (business_name, business_type, template_type, custom_data, system_prompt, retell_agent_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        business_name,
        business_type,
        template_type,
        typeof custom_data === 'string' ? custom_data : JSON.stringify(custom_data),
        system_prompt,
        retell_agent_id ?? null,
        status,
      )

    const created = db
      .prepare('SELECT * FROM clients WHERE id = ?')
      .get(result.lastInsertRowid) as ClientRow

    return res.status(201).json(created)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
