import type { NextApiRequest, NextApiResponse } from 'next'
import db, { type ClientRow } from '@/lib/db'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = Number(req.query.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

  if (req.method === 'GET') {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as ClientRow | undefined
    if (!client) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json(client)
  }

  if (req.method === 'PUT') {
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as ClientRow | undefined
    if (!existing) return res.status(404).json({ error: 'Not found' })

    const {
      business_name,
      business_type,
      template_type,
      custom_data,
      system_prompt,
      retell_agent_id,
      status,
      brand_color,
      greeting,
    } = req.body as Partial<ClientRow>

    db.prepare(
      `UPDATE clients SET
         business_name   = COALESCE(?, business_name),
         business_type   = COALESCE(?, business_type),
         template_type   = COALESCE(?, template_type),
         custom_data     = COALESCE(?, custom_data),
         system_prompt   = COALESCE(?, system_prompt),
         retell_agent_id = COALESCE(?, retell_agent_id),
         status          = COALESCE(?, status),
         brand_color     = COALESCE(?, brand_color),
         greeting        = COALESCE(?, greeting),
         updated_at      = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).run(
      business_name ?? null,
      business_type ?? null,
      template_type ?? null,
      custom_data != null
        ? typeof custom_data === 'string' ? custom_data : JSON.stringify(custom_data)
        : null,
      system_prompt ?? null,
      retell_agent_id ?? null,
      status ?? null,
      brand_color ?? null,
      greeting ?? null,
      id,
    )

    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as ClientRow
    return res.status(200).json(updated)
  }

  res.setHeader('Allow', 'GET, PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}
