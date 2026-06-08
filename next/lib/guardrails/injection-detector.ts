export interface InjectionScanResult {
  safe: boolean
  type: 'sql' | 'xss' | 'prompt' | null
  detail: string | null
}

const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
  /(--|;|\/\*|\*\/)/,
  /(\bOR\b\s+\b\d+\b\s*=\s*\b\d+\b)/i,
  /('\s*(OR|AND)\s+')/i,
]

const XSS_PATTERNS = [
  /<script\b[^>]*>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
]

const PROMPT_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /you\s+are\s+now\s+(a|an|the)/i,
  /system\s*:\s*you\s+are/i,
  /\[system\]/i,
  /<\|im_start\|>/i,
  /disregard\s+(your\s+)?(instructions|rules|guidelines)/i,
]

export function scanInput(input: string): InjectionScanResult {
  if (!input || typeof input !== 'string') {
    return { safe: true, type: null, detail: null }
  }

  for (const pattern of SQL_PATTERNS) {
    if (pattern.test(input)) {
      return { safe: false, type: 'sql', detail: `SQL injection pattern detected: ${pattern.source}` }
    }
  }

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return { safe: false, type: 'xss', detail: `XSS pattern detected: ${pattern.source}` }
    }
  }

  for (const pattern of PROMPT_PATTERNS) {
    if (pattern.test(input)) {
      return { safe: false, type: 'prompt', detail: `Prompt injection pattern detected: ${pattern.source}` }
    }
  }

  return { safe: true, type: null, detail: null }
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
