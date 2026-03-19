import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'receptionist.db')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Singleton to avoid multiple connections in Next.js dev mode
declare global {
  // eslint-disable-next-line no-var
  var _db: Database.Database | undefined
}

const db: Database.Database = global._db ?? new Database(DB_PATH)

if (process.env.NODE_ENV !== 'production') {
  global._db = db
}

// Schema init
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    template_type TEXT NOT NULL DEFAULT 'general',
    custom_data TEXT NOT NULL DEFAULT '{}',
    system_prompt TEXT NOT NULL DEFAULT '',
    retell_agent_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    channel TEXT NOT NULL DEFAULT 'chat',
    messages TEXT NOT NULL DEFAULT '[]',
    caller_name TEXT,
    caller_phone TEXT,
    caller_reason TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    business_type TEXT,
    message TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)

export default db

// ── Typed row interfaces ──────────────────────────────────────────────────────

export interface ClientRow {
  id: number
  business_name: string
  business_type: string
  template_type: string
  custom_data: string
  system_prompt: string
  retell_agent_id: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface ConversationRow {
  id: number
  client_id: number
  channel: 'chat' | 'voice'
  messages: string
  caller_name: string | null
  caller_phone: string | null
  caller_reason: string | null
  created_at: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}
