import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5433', 10),
    database: process.env.PGDATABASE || 'ubek_next',
    user: process.env.PGUSER || 'ubek',
    password: process.env.PGPASSWORD || 'ubek',
  },
})
