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

/**
 * Run work inside a database transaction.
 * Use for multi-statement operations that must be atomic (e.g. session + messages, vault + rag chunks, audit).
 * The callback receives a tx that can be passed to stores if they are updated to accept an executor.
 */
export async function withTransaction<T>(
  fn: (tx: ReturnType<ReturnType<typeof drizzle>['transaction']> extends Promise<infer Tx> ? Tx : any) => Promise<T>
): Promise<T> {
  const database = getDb()
  return database.transaction(async (tx) => {
    return fn(tx as any)
  })
}
