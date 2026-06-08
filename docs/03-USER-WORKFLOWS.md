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
3. Można umieścić plik w folderze Vault (lub przypisać do projektu)
4. Agent otrzymuje tool call: `file_analyze({ fileId })`
5. Agent analizuje plik (OCR dla obrazów, tekst dla PDF)
6. Odpowiada podsumowaniem zawartości
7. Plik dostępny w `/vault` z podglądem

## 5. Document Generation

1. User: "Generuj raport w PDF z analizy konkurencji"
2. Agent przygotowuje treść w markdown
3. Tool call: `generate_document({ title, content, format: 'pdf' })`
4. DocumentService: markdown → HTML (`marked`) → PDF (`pdfkit`)
5. Plik zapisany w Vault (folder projektu lub domyślny)
6. Agent odpowiada: "Raport gotowy: [link do pliku](/vault/...)"

Dostępne formaty: **PDF**, **DOCX**, **XLSX**, **Markdown**.

## 6. Projekty (Gems)

1. User klika "Nowy projekt" w sidebarze
2. Wprowadza nazwę: "Klient XYZ"
3. Wpisuje instrukcje: "Jesteś asystentem do obsługi klienta XYZ. Znaj znasz ich produkt..."
4. Dodaje dokumenty: cennik.pdf, oferta.docx, umowa.pdf
5. Dokumenty są chunowane i embedowane → RAG gotowy
6. User przełącza projekt → sidebar/top-bar selector
7. Agent ma kontekst projektu: instrukcje + dokumenty + pamięć
8. User rozmawia → agent odpowiada na podstawie dokumentów projektu
9. User może zarządzać extensionami per projekt

## 6. RAG / Knowledge Base

1. User dodaje dokumenty do projektu (PDF, DOCX, TXT, MD)
2. Backend: chunk → embed (Router LLM) → pgvector
3. User zadaje pytanie: "Co było w ofercie dla klienta XYZ?"
4. Agent: embed query → cosine similarity → top-10 chunków
5. Chunk-i wstrzyknięte do promptu jako kontekst
6. Agent odpowiada z cytowaniem źródła (source-url, source-document)
7. AI Elements Sources + InlineCitation renderują źródła
8. User widzi które dokumenty były użyte

## 7. Deep Research

1. User: "Zbadaj rynek konkurencji dla małych firm w Polsce"
2. Agent tworzy plan: [konkurenci, ceny, opinie, trendy]
3. AI Elements Plan: wyświetla plan z krokami
4. Agent wykonuje każdy krok: web search → extract → summarize
5. AI Elements Task: postęp każdego kroku (pending → running → done)
6. Agent kompiluje raport końcowy z cytowaniami
7. AI Elements Artifact: raport jako osobny dokument
8. User może wyeksportować raport (PDF/MD)

## 8. Extension Request

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
