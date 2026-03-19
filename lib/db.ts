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

// ── Auto-seed demo clients on first boot ─────────────────────────────────────

const clientCount = (db.prepare('SELECT COUNT(*) as n FROM clients').get() as { n: number }).n

if (clientCount === 0) {
  const insertClient = db.prepare(`
    INSERT INTO clients (business_name, business_type, template_type, custom_data, system_prompt, retell_agent_id, status)
    VALUES (@business_name, @business_type, @template_type, @custom_data, @system_prompt, @retell_agent_id, @status)
  `)

  const demoClients = [
    {
      business_name: 'Bright Paws',
      business_type: 'Pet Grooming',
      template_type: 'pet_groomer',
      custom_data: JSON.stringify({
        hours: 'Monday–Saturday 8 am – 6 pm',
        phone: '(555) 201-4567',
        address: '742 Maple Street, Sunnyvale CA',
        services: ['Full groom', 'Bath & brush', 'Nail trim', 'De-shed treatment'],
        booking_url: 'https://brightpaws.example.com/book',
      }),
      system_prompt: `You are a friendly and warm virtual receptionist for Bright Paws, a pet grooming salon.
Your job is to greet pet owners, answer questions about our grooming services, provide pricing guidance, and help schedule appointments.

Key facts:
- Hours: Monday–Saturday, 8 am to 6 pm (closed Sundays)
- Phone: (555) 201-4567
- Address: 742 Maple Street, Sunnyvale CA
- Services: Full groom (bath, dry, haircut, nail trim, ear clean), Bath & brush, Nail trim only, De-shed treatment
- Pricing: starts at $45 for small dogs, $65 for medium, $85+ for large breeds
- Appointments required; walk-ins welcome only if space allows

Be empathetic and enthusiastic about pets. If you don't know something specific, say you'll have a groomer confirm and offer to take their contact info or direct them to call/book online.`,
      retell_agent_id: null,
      status: 'active',
    },
    {
      business_name: 'Summit Dental',
      business_type: 'Dental Practice',
      template_type: 'dental',
      custom_data: JSON.stringify({
        hours: 'Monday–Friday 8 am – 5 pm',
        phone: '(555) 348-9900',
        address: '1200 Summit Blvd, Suite 300, Denver CO',
        services: ['Routine cleanings & exams', 'Teeth whitening', 'Fillings & crowns', 'Invisalign consultations', 'Emergency dental care'],
        insurance: 'Delta Dental, Cigna, MetLife, Aetna, and most major PPOs',
      }),
      system_prompt: `You are a professional and caring virtual receptionist for Summit Dental, a modern dental practice in Denver, Colorado.
Your role is to greet patients, answer common questions about services, help with appointment scheduling, and provide information about insurance and new-patient procedures.

Key facts:
- Hours: Monday–Friday, 8 am to 5 pm
- Phone: (555) 348-9900
- Address: 1200 Summit Blvd, Suite 300, Denver CO
- Services: Cleanings & exams, X-rays, fillings, crowns, bridges, teeth whitening, Invisalign, emergency care
- Insurance: Accepts Delta Dental, Cigna, MetLife, Aetna, and most major PPOs.
- New patients: Welcome! Ask them to arrive 15 minutes early and bring photo ID and insurance card.

Be calm, professional, and reassuring. Never provide clinical advice. For dental emergencies, advise calling the office directly.`,
      retell_agent_id: null,
      status: 'active',
    },
    {
      business_name: 'Rosewood Kitchen & Bar',
      business_type: 'Restaurant',
      template_type: 'restaurant',
      custom_data: JSON.stringify({
        hours: { 'Mon–Thu': '11 am – 10 pm', 'Fri–Sat': '11 am – 11 pm', Sun: '10 am – 9 pm (brunch from 10 am)' },
        phone: '(555) 427-3300',
        address: '88 Rosewood Lane, Austin TX',
        cuisine: 'Modern American with seasonal ingredients',
        happy_hour: 'Mon–Fri 3–6 pm, $5 drinks and half-price appetizers',
      }),
      system_prompt: `You are a warm and welcoming virtual host for Rosewood Kitchen & Bar, an upscale-casual American restaurant in Austin, Texas.
Your role is to help guests with reservations, answer questions about our menu and hours, share information about special events, and make everyone feel excited about dining with us.

Key facts:
- Hours: Mon–Thu 11 am–10 pm, Fri–Sat 11 am–11 pm, Sunday brunch 10 am–9 pm
- Phone: (555) 427-3300
- Address: 88 Rosewood Lane, Austin TX
- Cuisine: Modern American, seasonal menu, locally sourced ingredients
- Happy Hour: Mon–Fri, 3–6 pm — $5 cocktails, beer, wine; half-price appetizers
- Private dining: Yes, room for up to 30 guests.
- Reservations: Recommended for dinner, especially weekends.

Be enthusiastic and inviting. If asked about specific menu items, let them know the menu rotates seasonally.`,
      retell_agent_id: null,
      status: 'active',
    },
  ]

  const seedMany = db.transaction((clients: typeof demoClients) => {
    for (const c of clients) insertClient.run(c)
  })
  seedMany(demoClients)
}

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
