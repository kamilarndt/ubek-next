import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../drizzle/schema'

let _db: ReturnType<typeof drizzle> | null = null
let _pool: Pool | null = null

export function getDb() {
  if (!_db) {
    _pool = new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5433', 10),
      database: process.env.PGDATABASE || 'ubek_next',
      user: process.env.PGUSER || 'ubek',
      password: process.env.PGPASSWORD || 'ubek',
      max: 20,
      idleTimeoutMillis: 30000,
    })

    _db = drizzle(_pool, { schema })
  }
  return _db
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  }
})

export function getPool() {
  if (!_pool) {
    getDb()
  }
  return _pool!
}

export async function closeDb() {
  if (_pool) {
    await _pool.end()
    _pool = null
    _db = null
  }
}
