import type { NextConfig } from 'next'
import fs from 'fs'
import path from 'path'

// Manually load .env variables if Next.js inferred the wrong root
if (!process.env.JWT_SECRET) {
  try {
    const pathsToSearch = [
      path.resolve(__dirname, '.env'),
      path.resolve(__dirname, '../.env'),
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '../.env'),
    ]
    for (const envPath of pathsToSearch) {
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8')
        const lines = envContent.split('\n')
        for (const line of lines) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
          if (match) {
            const key = match[1]
            let value = match[2] || ''
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1)
            } else if (value.startsWith("'") && value.endsWith("'")) {
              value = value.slice(1, -1)
            }
            if (!process.env[key]) {
              process.env[key] = value
            }
          }
        }
        break
      }
    }
  } catch (err) {
    console.error('Failed to manually load env file:', err)
  }
}

const config: NextConfig = {
  outputFileTracingRoot: process.env.IGNORE_WORKSPACE_ROOT
    ? undefined
    : undefined,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default config
