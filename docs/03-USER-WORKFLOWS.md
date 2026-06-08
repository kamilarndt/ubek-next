# UBEK Next — User Workflows

## 1. Rejestracja

1. User otwiera `/auth/sign-up`
2. Wprowadza email + hasło + nazwę firmy
3. Frontend wysyła POST /api/auth/sign-up
4. Backend: bcrypt hash → INSERT do users → generuje JWT
5. Redirect do `/chat`
6. (opcjonalnie) Agent wita się i pyta o biznes → zapamiętuje w Memory API

## 2. Logowanie

1. User otwiera `/auth/sign-in`
2. Wprowadza email + hasło
3. POST /api/auth/sign-in → verify password → JWT
4. JWT zapisany w httpOnly cookie
5. Redirect do `/chat`
6. Sidebar ładuje extensiony usera z GET /api/extensions

## 3. Główny czat

1. User widzi stronę `/chat` z Conversation + PromptInput
2. Pisze wiadomość: "Znajdź informacje o konkurencji"
3. `useChat()` → DefaultChatTransport → POST http://localhost:4000/api/chat/stream
4. Pi Agent odbiera → TenantSessionPool → AgentSession → Router LLM
5. Agent wykonuje tool call: `web_search({ query: "konkurencja" })`
6. Wyniki streamowane przez AI SDK Stream Protocol
7. useChat() odbiera → AI Elements renderują:
   - Text: "Znalazłem następujące informacje..."
   - Sources: [URL1, URL2, URL3]
   - Tool: web_search (input → output)
8. User widzi pełną odpowiedź z cytowaniami

## 4. File Upload

1. User przeciąga plik do PromptInput (lub klika Attachments)
2. Plik uploadowany do Vault (POST /api/vault/upload)
3. Agent otrzymuje tool call: `file_analyze({ fileId })`
4. Agent analizuje plik (OCR dla obrazów, tekst dla PDF)
5. Odpowiada podsumowaniem zawartości
6. Plik dostępny w `/vault` z podglądem i paginacją

## 5. Extension Request

1. User: "Potrzebuję generować oferty dla klientów"
2. Agent: "Rozumiem, zgłaszam potrzebę" → tool `ubek_request_extension`
3. Zapis w PostgreSQL: `extension_requests` (user_id, description, status='new')
4. Admin widzi zgłoszenie w Admin Dashboard (`/admin/requests`)
5. Admin: "Zbuduję extension ofert"
6. Admin tworzy `extensions/offers/tool.ts` + `manifest.json` + `ui/page.tsx`
7. Admin przypisuje extension do usera przez Admin Dashboard
8. User widzi nową zakładkę "Oferty" w sidebarze
9. User klika → dynamiczna strona `/ext/offers` → działa

## 6. Admin Dashboard

### Agent Monitor (`/admin/agents`)
- Lista aktywnych sesji (user, czas trwania, liczba tool calls, model)
- Podgląd ostatniej wiadomości
- Możliwość przerwania sesji

### Extension Manager (`/admin/extensions`)
- Lista wszystkich extensionów w library
- Klik → szczegóły: manifest, tool definition, wersja
- Przypisanie do usera: toggle per-user
- Builder: tworzenie nowego extensionu z szablonu

### Extension Requests (`/admin/requests`)
- Lista zgłoszeń od userów (status: new, in-progress, done, rejected)
- Klik → szczegóły: user, opis, data
- Akcja: "Build extension" → otwiera Extension Builder z pre-filled danymi
- Akcja: "Reject" → user dostaje powiadomienie

### Personality Config (`/admin/personality`)
- Per-user system prompt (SKILL.md)
- Preview odpowiedzi
- Reset do domyślnego

## 7. Onboarding (P1)

1. Nowy user po rejestracji widzi: "Cześć! Jestem UBEK, Twój asystent."
2. Agent zadaje serię pytań: "Czym się zajmujesz? Jaka branża? Czego potrzebujesz?"
3. Odpowiedzi zapisywane w Memory API
4. Agent buduje profil użytkownika
5. Na tej podstawie Admin może zaproponować extensiony
