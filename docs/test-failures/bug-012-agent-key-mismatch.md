# BUG-012: Pi Agent AGENT_API_KEY mismatch

**Severity:** P1 (critical) — BLOCKER for agent API access

## Symptom
Running Pi Agent processes reject \`x-agent-api-key\` header. The key in process environ is ~14 chars but \`.env\` has 64 hex chars.

## Evidence
- \`.env\` AGENT_API_KEY length: 64 chars hex
- \`/proc/38250/environ\` AGENT_API_KEY line total: 29 bytes → actual key is ~14 chars
- \`curl -H \"x-agent-api-key: <64char_key>\" localhost:4000/api/...\` → 401
- Python \`requests\` same result

## Root cause
Pi Agent processes were started before the .env was updated, or a different startup script injected a different key.

## Fix
Restart Pi Agent with current \`.env\` or update \`.env\` to match running process key.

## Verification
After fix: \`curl -H \"x-agent-api-key: <correct_key>\" localhost:4000/api/chat/sessions\` should return 200, not 401.
ENDOF
