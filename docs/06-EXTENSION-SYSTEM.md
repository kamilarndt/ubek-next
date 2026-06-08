# UBEK Next — Extension System

## Koncept

Extension to podstawowy produkt UBEK. Każdy extension to narzędzie (tool) w Pi SDK + opcjonalnie strona w UI.
Admin buduje extensiony na zamówienie użytkowników. Extensiony są powielalne między userów.

## Struktura

```
extensions/                        ← Wspólny katalog w root projektu
├── _registry.ts                    ← Auto-import wszystkich tool.ts
├── core/                           ← Default Tools (zawsze aktywne)
│   ├── vision/
│   │   ├── manifest.json
│   │   └── tool.ts
│   ├── web-search/
│   │   ├── manifest.json
│   │   └── tool.ts
│   ├── document-gen/
│   │   ├── manifest.json
│   │   └── tool.ts
│   └── memory/
│       ├── manifest.json
│       └── tool.ts
├── social-media/                   ← Custom extension (przykład)
│   ├── manifest.json
│   ├── tool.ts                     ← pi.registerTool()
│   └── ui/
│       ├── page.tsx                ← React component
│       └── components/             ← specyficzne komponenty
└── crm/                            ← Custom extension
    ├── manifest.json
    ├── tool.ts
    └── ui/page.tsx
```

## manifest.json

```json
{
  "name": "social-media",
  "description": "Zarządzanie mediami społecznościowymi",
  "version": "1.0.0",
  "author": "admin",
  "icon": "share2",
  "route": "/ext/social-media",
  "sidebar": {
    "label": "Social Media",
    "icon": "share2",
    "order": 10,
    "section": "Narzędzia"
  },
  "tools": ["post_to_social", "analytics", "scheduler"]
}
```

## tool.ts

```typescript
import { z } from 'zod';

// Tool definicja dla Pi SDK — zwykły obiekt z nazwą, schematem i execute
export const socialMediaTool = {
  name: 'post_to_social',
  description: 'Publikuj post na wybranych platformach social media',
  parameters: z.object({
    platform: z.enum(['twitter', 'linkedin', 'facebook']),
    content: z.string().max(280),
    schedule: z.string().optional(),
  }),
  execute: async ({ platform, content }) => {
    return { status: 'published', url: `https://${platform}.com/post/123` };
  },
};

// Tool jest rejestrowany w Pi SDK przez PiAgentService.loadTenantExtensions()
// Przez pi.registerTool(nazwa, definicja)
```

## _registry.ts

```typescript
// Auto-import wszystkich tool.ts z extensionów
// Next.js Webpack/Vite kompiluje wszystko w buildzie
// Pi Agent ładuje przez dynamic import przy starcie

export const coreTools = [
  require('./core/vision/tool').default,
  require('./core/web-search/tool').default,
  require('./core/document-gen/tool').default,
  require('./core/memory/tool').default,
];
```

## Per-user activation

PostgreSQL:
```sql
CREATE TABLE user_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  extension_name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, extension_name)
);
```

API:
- `GET /api/extensions?tenantId=X` — lista aktywnych extensionów dla usera
- `PUT /api/extensions` — admin przypisuje/odpina extension (admin only)

## Pi Agent — tool loading

```typescript
// agent/src/PiAgentService.ts
import { getSDK } from './sdk';

class PiAgentService {
  async loadTenantExtensions(tenantId: string) {
    // 1. Pobierz z DB aktywne extensiony dla tenant
    const activeExts = await db.query(
      'SELECT extension_name FROM user_extensions WHERE tenant_id = $1 AND enabled = true',
      [tenantId]
    );
    
    // 2. Dla każdego extensionu, dynamicznie zaimportuj tool.ts
    const tools = [];
    for (const ext of activeExts) {
      // Sanityzacja: tylko alphanumeric + dash
      if (!/^[a-z0-9-]+$/.test(ext.extension_name)) continue;
      
      const toolModule = await import(
        `../../extensions/${ext.extension_name}/tool.ts`
      );
      if (toolModule?.socialMediaTool) tools.push(toolModule.socialMediaTool);
    }
    
    // 3. Zarejestruj w Pi SDK przez pi.registerTool()
    const pi = await getSDK();
    tools.forEach(t => pi.registerTool(t.name, {
      description: t.description,
      parameters: t.parameters,
      execute: t.execute,
    }));
    
    return tools;
  }
}
```

## Extension Library (przyszłość)

W Phase 3, extensiony mogą być publikowane jako pakiety npm lub MCP servers:
- Prywatny npm registry: `@ubek-extensions/social-media`
- MCP server: `connect('http://extensions:3100/mcp')` → tools()

Na Phase 1, file-based TypeScript jest prostszy i szybszy.
