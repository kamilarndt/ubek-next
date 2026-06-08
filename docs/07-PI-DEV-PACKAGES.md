# UBEK Next — Pi.dev Packages

Poniższe pakiety z [pi.dev/packages](https://pi.dev/packages) można wykorzystać w UBEK Next
jako gotowe implementacje Default Tools lub rozszerzeń.

## Default Tools

### pi-web-access (nicopreme) — 90.8K downloads/mo
- **Co daje**: web search + URL fetch + PDF extraction + YouTube understanding + local video analysis
- **Użycie**: `npm install pi-web-access`
- **Default Tool**: Web Search — zastępuje starego fetch-based searcha
- **Tool name**: `web_search`, `web_fetch`, `pdf_extract`, `youtube_analyze`

### pi-ocr (astronaut_jack) — 3.1K downloads/mo
- **Co daje**: OCR multi-backend (MinerU cloud, Ollama local GPU, Pix2Text local)
- **Użycie**: `npm install pi-ocr`
- **Default Tool**: Vision / OCR — analiza obrazów, wyciąganie tekstu, formuł, tabel

## Pamięć

### pi-hermes-memory — 10.9K downloads/mo
- **Co daje**: persistent memory + session search + secret scanning (SQLite FTS5, 368 testów)
- **Użycie**: `npm install pi-hermes-memory`
- **Faza 2**: potencjalny zamiennik Memory API (:18766) — jeden npm install zamiast osobnego Python serwisu

### gentle-engram — 9.5K downloads/mo
- **Co daje**: persistent memory shared across sessions, local-or-cloud
- **Użycie**: npm install
- **Status**: lżejsza alternatywa dla pi-hermes-memory

## Ekosystem

### pi-mcp-adapter — 99.2K downloads/mo
- **Co daje**: MCP adapter — dostęp do setek MCP serwerów (bazy danych, API, narzędzia)
- **Użycie**: `npm install pi-mcp-adapter`
- **Faza 3**: kluczowy dla skalowania — extensiony jako MCP servers

### pi-subagents — 103.2K downloads/mo
- **Co daje**: delegacja zadań do subagentów z chains, parallel, TUI
- **Użycie**: `npm install pi-subagents`
- **Faza 2**: Deep Research — wieloetapowy research z subagentami

### @aliou/pi-guardrails — 6.5K downloads/mo
- **Co daje**: guardrails dla Pi Agent
- **Użycie**: npm install
- **Status**: do zbadania — potencjalne uzupełnienie własnych guardrails

## UX

### pi-autoname — 2.4K downloads/mo
- **Co daje**: AI-powered session naming
- **Użycie**: npm install
- **Faza 2**: automatyczne nazwy konwersacji (zamiast "Chat #1")

## Instalacja

```bash
# Pi Agent (agent/)
cd agent
npm install pi-web-access pi-ocr pi-hermes-memory pi-mcp-adapter pi-subagents pi-autoname
```

Następnie w `extensions/_registry.ts`:
```typescript
import { webSearch, webFetch } from 'pi-web-access';
import { ocrAnalyze } from 'pi-ocr';

export const piDevTools = [
  { name: 'web_search', ...webSearch },
  { name: 'web_fetch', ...webFetch },
  { name: 'vision_ocr', ...ocrAnalyze },
];
```

## Uwagi

- Wszystkie pakiety działają przez `pi.registerTool()` → rejestrują tool-e w Pi SDK
- Tool-e są backendowe — nie mają UI. UI robimy przez AI Elements lub extension pages
- W Phase 1 używamy tylko pi-web-access i pi-ocr jako Default Tools
- pi-hermes-memory to Phase 2 — zastąpienie Memory API (:18766) po walidacji
- pi-mcp-adapter to Phase 3 — ekosystem MCP zamiast file-based extensionów
