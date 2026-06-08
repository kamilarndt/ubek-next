# UBEK Next — Test Checklist

## Frontend

### Chat
- [ ] `useChat()` łączy się z Pi Agent przez DefaultChatTransport
- [ ] Streamowanie: pierwszy token <500ms
- [ ] AI Elements renderują: Conversation, Message, PromptInput
- [ ] Tool calls: AI Elements Tool component pokazuje input/output
- [ ] Reasoning: ChainOfThought / Reasoning component działa
- [ ] Sources: Sources + InlineCitation renderują się
- [ ] Shimmer: animacja podczas streamowania
- [ ] Attachments: upload pliku przez PromptInput działa
- [ ] Regenerate: kliknięcie Regenerate wysyła nowy request
- [ ] Copy: kopiowanie odpowiedzi działa

### Auth
- [ ] Sign-up: formularz waliduje email, hasło, nazwę
- [ ] Sign-in: poprawne dane → JWT → redirect
- [ ] Sign-in: błędne dane → komunikat błędu
- [ ] JWT: middleware blokuje niezalogowanych
- [ ] JWT: wygasły token → przekierowanie do /auth/sign-in
- [ ] Logout: usuwa JWT → redirect

### Vault
- [ ] Lista plików
- [ ] Upload: drag & drop, file picker
- [ ] Upload: limit rozmiaru (100MB)
- [ ] Preview: PDF, obraz, tekst
- [ ] Foldery: tworzenie, nawigacja, przenoszenie plików

### Sidebar
- [ ] Sidebar pokazuje: Nowa rozmowa, Chat, Vault, Settings
- [ ] Sidebar dynamiczny: extensiony pojawiają się gdy przypisane
- [ ] Sidebar: kliknięcie zmienia stronę

### Extension UI
- [ ] `ext/[name]/page.tsx` ładuje się dynamicznie
- [ ] Extension page renderuje React component z extensionu
- [ ] Extension bez UI (tylko tool) nie dodaje zakładki

### Admin Dashboard
- [ ] Agent Monitor: pokazuje aktywne sesje
- [ ] Extension Manager: lista extensionów, toggle per-user
- [ ] Extension Requests: lista zgłoszeń, zmiana statusu
- [ ] Personality Config: edycja SKILL.md per user

## Backend (Pi Agent)

### Streaming
- [ ] POST /api/chat/stream → 200 z SSE
- [ ] SSE zawiera AI SDK Stream Protocol: text-delta, reasoning-delta, tool-input, tool-output, finish
- [ ] Multi-step tool calling: tool-result → next step → finish
- [ ] Błąd toola: tool-output z isError: true

### TenantSessionPool
- [ ] getOrCreate(tenantId) zwraca AgentSession
- [ ] Dwa różne tenantId → dwie różne sesje
- [ ] Session timeout: brak aktywności przez 30min → cleanup
- [ ] AgentSession ma załadowane tool-e z extensions/*/tool.ts

### Extensions Loading
- [ ] `_registry.ts` importuje wszystkie tool.ts
- [ ] loadTenantExtensions(tenantId) zwraca tylko tool-e przypisane do tenant
- [ ] Tenant bez extensionów → tylko Default Tools
- [ ] Nowy extension → restart Pi Agenta → tool dostępny

### Guardrails
- [ ] InjectionDetector: blokuje prompt injection patterns
- [ ] RateLimiter: >30 req/min → 429 Too Many Requests
- [ ] AuditLogger: zapisuje każdy request do PostgreSQL
- [ ] JWT: nieprawidłowy token → 401

## Integration (E2E)

### Full Chat Flow
- [ ] user: auth → chat → wiadomość → stream → odpowiedź
- [ ] user: file upload → agent analizuje → odpowiedź
- [ ] user: web search → agent szuka → odpowiedź z cytowaniami

### Extension Lifecycle
- [ ] Admin tworzy extension → restart → tool dostępny w sessji
- [ ] Admin przypisuje do usera → sidebar pokazuje zakładkę
- [ ] User klika zakładkę → strona extensionu ładuje się
- [ ] User używa toola → wykonuje się poprawnie

### Auth + Guardrails
- [ ] Niezalogowany → próba dostępu do /chat → redirect
- [ ] Zalogowany → access do /admin tylko dla admina
- [ ] Rate limit → 30 szybkich requestów → 429

## Deploy

- [ ] PM2: oba procesy startują (`pm2 start pm2.config.js`)
- [ ] PM2: restart po crashu (max_restarts: 10)
- [ ] .env: wszystkie zmienne skonfigurowane
- [ ] Build: `cd next && npm run build` → .next/
- [ ] Build: `cd agent && npx tsc` → dist/

## Performance

- [ ] Pierwszy token <500ms
- [ ] Full odpowiedź <30s (dla długich odpowiedzi)
- [ ] Memory: sesja <50MB RAM
- [ ] Concurrent: 20 userów jednocześnie → wszystkie sesje działają

## Security

- [ ] JWT: secret w .env, nie w kodzie
- [ ] SQL: wszystkie query parametryzowane
- [ ] Upload: limit rozmiaru, typy plików
- [ ] Guardrails: InjectionDetector na każdym inpucie
- [ ] Rate limit: na endpointach API
