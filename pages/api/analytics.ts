import type { NextApiRequest, NextApiResponse } from 'next'
import db from '@/lib/db'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  // Total conversations per client
  const convPerClient = db.prepare(`
    SELECT c.id, c.business_name, COUNT(cv.id) as total_conversations,
           SUM(CASE WHEN cv.channel = 'voice' THEN 1 ELSE 0 END) as voice_conversations,
           SUM(CASE WHEN cv.channel = 'chat'  THEN 1 ELSE 0 END) as chat_conversations
    FROM clients c
    LEFT JOIN conversations cv ON cv.client_id = c.id
    WHERE c.status = 'active'
    GROUP BY c.id
    ORDER BY total_conversations DESC
  `).all() as Array<{
    id: number; business_name: string
    total_conversations: number; voice_conversations: number; chat_conversations: number
  }>

  // Conversations per day — last 14 days
  const dailyConvs = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM conversations
    WHERE created_at >= DATE('now', '-14 days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all() as Array<{ date: string; count: number }>

  // Total leads + last 14 days
  const totalLeads = (db.prepare('SELECT COUNT(*) as n FROM leads').get() as { n: number }).n
  const recentLeads = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM leads
    WHERE created_at >= DATE('now', '-14 days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all() as Array<{ date: string; count: number }>

  // Message totals
  const msgStats = db.prepare(`
    SELECT COUNT(*) as total_conversations,
           SUM(json_array_length(messages)) as total_messages
    FROM conversations
  `).get() as { total_conversations: number; total_messages: number }

  return res.status(200).json({
    clients:           convPerClient,
    daily_conversations: dailyConvs,
    total_leads:       totalLeads,
    recent_leads:      recentLeads,
    total_conversations: msgStats?.total_conversations || 0,
    total_messages:    msgStats?.total_messages || 0,
  })
}
