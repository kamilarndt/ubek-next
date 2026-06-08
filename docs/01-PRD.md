# UBEK Next — Product Requirements Document

## Cel

UBEK Next to prywatna platforma do uruchamiania spersonalizowanych agentów AI dla małych firm.
Phase 1: max 20 użytkowników. Agent działa na bazie Pi Coding Agent SDK, frontend na Vercel AI SDK v6.

## User Personas

### Admin (Kamil)
- Buduje extensiony na zamówienie użytkowników
- Zarządza użytkownikami i ich przypisaniami
- Widzi Agent Monitor (aktywne sesje, usage)
- Konfiguruje personality (system prompt) per user
- Odpowiada na Extension Requests

### Użytkownik
- Rozmawia z agentem w czacie
- Używa Vault do przechowywania plików
- Ma dynamiczny sidebar z extensionami (widzi tylko swoje)
- Może poprosić o nową funkcjonalność (Extension Request)
- Nie konfiguruje sam — robi to Admin

## Functional Requirements

### P0 — Ship It (Phase 1 MVP)

| ID | Feature | Opis |
|----|---------|------|
| F-01 | Chat streaming | rozmowa z agentem przez SSE / AI SDK Stream Protocol |
| F-02 | Auth | JWT (httpOnly cookie) — sign-up, sign-in, logout, middleware |
| F-03 | System prompt | SKILL.md per tenant + per project instructions |
| F-04 | PL/EN | agent odpowiada w języku użytkownika |
| F-05 | Guardrails | InjectionDetector, RateLimiter, AuditLogger |
| F-06 | Frontend UI | AI Elements: Conversation, Message, PromptInput |
| F-07 | Vault | upload plików, foldery, lista, preview |
| F-08 | Default Tools | vision, web-search, document-gen, memory |
| F-09 | Projects | projekty z custom instructions + KB + memory + extensions (jak Gems) |
| F-10 | RAG / Knowledge Base | chunkowanie, embedowanie, semantic search, cytowanie źródeł |
| F-11 | Deep Research | wieloetapowy research z planem, web search, raportem |
| F-12 | Conversation history | lista poprzednich rozmów, resume per project |

### P1 — Next

| ID | Feature | Opis |
|----|---------|------|
| F-09 | Conversation history | lista poprzednich rozmów, resume |
| F-10 | Regenerate + Copy | akcje na odpowiedziach |
| F-11 | Memory API | cross-session pamięć preferencji |
| F-33 | Dynamic sidebar | zakładki z extensionów |
| F-30 | Admin Dashboard | Agent Monitor, Extension Manager, Requests |

### P2 — Future

| ID | Feature | Opis |
|----|---------|------|
| F-20 | Canvas | side-by-side edytor + podgląd |
| F-21 | Deep Research | wieloetapowy research z subagentami |
| F-22 | Reasoning mode | chain-of-thought (o1, Grok Think) |
| F-23 | Code Sandbox | Python execution w izolacji |
| F-24 | Web Agent | autonomiczne działanie na stronach |
| F-25 | Mobile | React Native / PWA |

## Non-functional Requirements

| Wymaganie | Wartość |
|-----------|---------|
| Max użytkownicy (Phase 1) | 20 |
| Tenant isolation | WHERE tenant_id = ? na każdym zapytaniu SQL |
| Session lifetime | długość życia sesji Pi SDK (in-memory) |
| Response time | <500ms (pierwszy token), <30s (full response) |
| Język | PL/EN — agent dostosowuje się do języka użytkownika |
| Deploy | PM2, dwa procesy (Next.js + Pi Agent) |

## Default Tools

| Tool | Opis | Źródło |
|------|------|--------|
| Vision | analiza obrazów, OCR, wykresy | `pi-ocr` (3.1K/mo) |
| Web Search | wyszukiwanie z cytowaniem | `pi-web-access` (90.8K/mo) |
| Document Gen | Markdown, PDF (`pdfkit`), DOCX (`docx`), XLSX (`exceljs`) | własny (przepisany) |
| Memory | zapamiętywanie faktów o userze | Memory API (:18766) |
| File Upload | upload do Vault + analiza (część Vault API) | Vault API |
| RAG | semantic search po dokumentach projektu | RAGService.ts (reuse) |
| Deep Research | wieloetapowy research z subagentami | własna implementacja |
