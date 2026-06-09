import { db, getPool } from '../lib/db'
import { hashPassword } from '../lib/auth'
import { users, projects } from '../drizzle/schema'

async function seed() {
  const pool = getPool()
  const hashed = await hashPassword('admin123')
  const user = await db.insert(users).values({
    email: 'admin@ubek.ai',
    passwordHash: hashed,
    name: 'Admin',
    role: 'admin',
  }).returning()

  console.log(`Created user: ${user[0].email} (password: admin123)`)

  const gem = await db.insert(projects).values({
    userId: user[0].id,
    name: 'General',
    instructions: '',
    icon: 'gem',
  }).returning()

  console.log(`Created gem: ${gem[0].name}`)

  await pool.end()
  console.log('Seed complete')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
