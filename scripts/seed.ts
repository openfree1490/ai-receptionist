/**
 * Seed script — run with: npm run seed
 * Idempotent: skips if a client with the same business_name already exists.
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'receptionist.db')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(DB_PATH)

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

Be empathetic and enthusiastic about pets. If you don't know something specific (e.g., exact pricing for a breed), say you'll have a groomer confirm and offer to take their contact info or direct them to call/book online.`,
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
      services: [
        'Routine cleanings & exams',
        'Teeth whitening',
        'Fillings & crowns',
        'Invisalign consultations',
        'Emergency dental care',
      ],
      insurance: 'Delta Dental, Cigna, MetLife, Aetna, and most major PPOs',
      new_patient_url: 'https://summitdental.example.com/new-patient',
    }),
    system_prompt: `You are a professional and caring virtual receptionist for Summit Dental, a modern dental practice in Denver, Colorado.
Your role is to greet patients, answer common questions about services, help with appointment scheduling, and provide information about insurance and new-patient procedures.

Key facts:
- Hours: Monday–Friday, 8 am to 5 pm
- Phone: (555) 348-9900
- Address: 1200 Summit Blvd, Suite 300, Denver CO
- Services: Cleanings & exams, X-rays, fillings, crowns, bridges, teeth whitening, Invisalign, emergency care
- Insurance: Accepts Delta Dental, Cigna, MetLife, Aetna, and most major PPOs. Always recommend patients call to verify coverage.
- New patients: Welcome! Ask them to arrive 15 minutes early and bring photo ID and insurance card.

Be calm, professional, and reassuring—many people feel anxious about dental visits. Never provide clinical advice. For dental emergencies, advise calling the office directly or going to an emergency room if after hours.`,
    retell_agent_id: null,
    status: 'active',
  },
  {
    business_name: 'Rosewood Kitchen & Bar',
    business_type: 'Restaurant',
    template_type: 'restaurant',
    custom_data: JSON.stringify({
      hours: {
        'Mon–Thu': '11 am – 10 pm',
        'Fri–Sat': '11 am – 11 pm',
        Sun: '10 am – 9 pm (brunch from 10 am)',
      },
      phone: '(555) 427-3300',
      address: '88 Rosewood Lane, Austin TX',
      cuisine: 'Modern American with seasonal ingredients',
      reservations_url: 'https://rosewood.example.com/reserve',
      private_dining: true,
      happy_hour: 'Mon–Fri 3–6 pm, $5 drinks and half-price appetizers',
    }),
    system_prompt: `You are a warm and welcoming virtual host for Rosewood Kitchen & Bar, an upscale-casual American restaurant in Austin, Texas.
Your role is to help guests with reservations, answer questions about our menu and hours, share information about special events, and make everyone feel excited about dining with us.

Key facts:
- Hours: Mon–Thu 11 am–10 pm, Fri–Sat 11 am–11 pm, Sunday brunch 10 am–9 pm
- Phone: (555) 427-3300
- Address: 88 Rosewood Lane, Austin TX
- Cuisine: Modern American, seasonal menu, locally sourced ingredients where possible
- Happy Hour: Mon–Fri, 3–6 pm — $5 cocktails, beer, and wine; half-price appetizers
- Private dining: Yes, we have a private room for up to 30 guests. Perfect for corporate events and celebrations.
- Reservations: Recommended for dinner, especially weekends. Walk-ins welcome for lunch and bar seating.
- Dietary options: Vegetarian, vegan, and gluten-free options available. Ask server for details.

Be enthusiastic and inviting. If asked about specific menu items or daily specials, let them know the menu rotates seasonally and you're happy to take a message for the chef or direct them to the website.`,
    retell_agent_id: null,
    status: 'active',
  },
]

const insert = db.prepare(`
  INSERT INTO clients
    (business_name, business_type, template_type, custom_data, system_prompt, retell_agent_id, status)
  VALUES
    (@business_name, @business_type, @template_type, @custom_data, @system_prompt, @retell_agent_id, @status)
`)

const exists = db.prepare('SELECT id FROM clients WHERE business_name = ?')

let created = 0
let skipped = 0

for (const client of demoClients) {
  const row = exists.get(client.business_name)
  if (row) {
    console.log(`  skip  "${client.business_name}" (already exists)`)
    skipped++
  } else {
    const result = insert.run(client)
    console.log(`  ✓ created "${client.business_name}" (id=${result.lastInsertRowid})`)
    created++
  }
}

console.log(`\nDone — ${created} created, ${skipped} skipped.`)
db.close()
