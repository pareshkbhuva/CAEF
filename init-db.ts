/**
 * Initialize the Postgres schema.
 *
 * Run once after connecting Vercel Postgres to this project:
 *
 *   npx vercel env pull .env.local
 *   npm run db:init
 *
 * Or from Vercel's dashboard using "Query" tab, paste the CREATE TABLE statements
 * from lib/db.ts manually.
 */

import { initDb } from '../lib/db'

async function main() {
  console.log('Initializing AgnosLogic Postgres schema…')
  try {
    await initDb()
    console.log('✓ Schema initialized successfully')
    console.log('Tables created: users, usage, public_demo_usage, jobs')
  } catch (err) {
    console.error('✗ Schema initialization failed:', err)
    process.exit(1)
  }
}

main()
