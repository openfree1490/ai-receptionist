import type { NextApiRequest, NextApiResponse } from 'next'
import db, { type ClientRow, type ConversationRow, type Message } from '@/lib/db'
import anthropic, { MODEL } from '@/lib/anthropic'

export const config = {
  api: {
    responseLimit: false,
  },
}

// Allow the widget to be embedded on any domain
function setCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { clientId, message, conversationId } = req.body as {
    clientId: string | number
    message: string
    conversationId?: number
  }

  if (!clientId || !message?.trim()) {
    return res.status(400).json({ error: 'clientId and message are required' })
  }

  // Fetch client
  const client = db
    .prepare('SELECT * FROM clients WHERE id = ? AND status = ?')
    .get(clientId, 'active') as ClientRow | undefined

  if (!client) {
    return res.status(404).json({ error: 'Client not found or inactive' })
  }

  // Load or create conversation
  let conversation: ConversationRow | undefined
  let messages: Message[] = []

  if (conversationId) {
    conversation = db
      .prepare('SELECT * FROM conversations WHERE id = ? AND client_id = ?')
      .get(conversationId, clientId) as ConversationRow | undefined
    if (conversation) {
      messages = JSON.parse(conversation.messages) as Message[]
    }
  }

  if (!conversation) {
    const result = db
      .prepare(
        'INSERT INTO conversations (client_id, channel, messages) VALUES (?, ?, ?)',
      )
      .run(clientId, 'chat', '[]')
    conversation = db
      .prepare('SELECT * FROM conversations WHERE id = ?')
      .get(result.lastInsertRowid) as ConversationRow
  }

  // Append user message
  messages.push({ role: 'user', content: message.trim() })

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Conversation-Id', String(conversation.id))
  res.flushHeaders()

  let assistantText = ''

  try {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      system: client.system_prompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        assistantText += event.delta.text
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
      }
    }

    // Persist updated messages
    messages.push({ role: 'assistant', content: assistantText })
    db.prepare('UPDATE conversations SET messages = ? WHERE id = ?').run(
      JSON.stringify(messages),
      conversation.id,
    )

    res.write(`data: ${JSON.stringify({ done: true, conversationId: conversation.id })}\n\n`)
  } catch (err) {
    console.error('Anthropic stream error:', err)
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
  } finally {
    res.end()
  }
}
