import * as fs from "fs/promises";
import * as path from "path";
import type { ToolDefinition } from "../types";
import type { Dirent, Stats } from "fs";

interface RegistryOptions {
  extensionsPath: string;
}

export class ExtensionRegistry {
  private static instance: ExtensionRegistry | null = null;
  private resolvedBase: string;
  private toolsCache: ToolDefinition[] | null = null;
  private options: RegistryOptions;

  private constructor(options: RegistryOptions) {
    this.options = options;
    this.resolvedBase = path.resolve(this.options.extensionsPath);
  }

  static getInstance(options?: RegistryOptions): ExtensionRegistry {
    if (!ExtensionRegistry.instance) {
      if (!options) {
        throw new Error(
          "ExtensionRegistry not initialized. Call getInstance with options first.",
        );
      }
      ExtensionRegistry.instance = new ExtensionRegistry(options);
    }
    return ExtensionRegistry.instance;
  }

  static reset(): void {
    ExtensionRegistry.instance = null;
  }

  async loadCoreTools(): Promise<ToolDefinition[]> {
    if (this.toolsCache) {
      return this.toolsCache;
    }

    const corePath = path.join(this.resolvedBase, "core");

    let entries: Dirent[];
    try {
      entries = await fs.readdir(corePath, { withFileTypes: true });
    } catch {
      this.toolsCache = [];
      return this.toolsCache;
    }

    const tools: ToolDefinition[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const toolPath = path.resolve(corePath, entry.name, "tool.ts");
  const jsPath = path.resolve(corePath, entry.name, "tool.js");

      if (!toolPath.startsWith(this.resolvedBase)) {
        continue;
      }

      let stat: Stats | null = null;
      try {
        stat = await fs.stat(toolPath);
      } catch {
        continue;
      }
      if (!stat.isFile()) continue;

      let mod: {
        name?: string;
        description?: string;
        schema?: { parse: (data: unknown) => unknown };
        execute?: (
          params: unknown,
          context?: { userId?: string },
        ) => Promise<{ content: { type: string; text: string }[] }>;
      };
      try {
        mod = await import(toolPath);
      } catch {
        try {
          mod = await import(jsPath);
        } catch {
          continue;
        }
      }

      const schema = mod.schema;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      if (schema) {
        const shape = (
          schema as unknown as { _def?: { shape?: Record<string, unknown> } }
        )._def?.shape;
        if (shape) {
          for (const [key, field] of Object.entries(shape)) {
            const zodField = field as {
              _def?: { typeName?: string; description?: string };
            };
            properties[key] = {
              type: "string",
              description: zodField._def?.description || key,
            };
          }
          required.push(...Object.keys(shape));
        }
      }

      tools.push({
        name: mod.name || entry.name.replace(/-/g, "_"),
        description: mod.description || `Core tool: ${entry.name}`,
        parameters: {
          type: "object",
          properties,
          required,
        },
        execute: async (params: unknown, context?: { userId?: string }) => {
          if (mod.execute) {
            return mod.execute(params, context);
          }
          return {
            content: [{ type: "text", text: `${entry.name} tool executed` }],
          };
        },
      });
    }

    this.toolsCache = tools;
    return tools;
  }

  async getToolsForProject(
    _projectId: string,
    extensionNames: string[],
  ): Promise<ToolDefinition[]> {
    // _projectId kept for signature compatibility + future (e.g. per-project caching or logging).
    // The kebab<->snake normalization supports the contract between:
    // - extension ids in DB / project_extensions / ?projectId API / sidebar / admin UI (kebab, e.g. "web-search")
    // - tool names produced by loadCoreTools (from dir or mod.name, snake e.g. "web_search") + Pi customTools list.
    // When enabledExtensions non-empty but 0 overlap, caller (chat route) treats as empty (no fallback names without wrappers).
    const all = await this.loadCoreTools();
    if (!extensionNames || extensionNames.length === 0) {
      return all;
    }
    const wanted = new Set<string>();
    for (const n of extensionNames) {
      wanted.add(n);
      wanted.add(n.replace(/-/g, "_"));
      wanted.add(n.replace(/_/g, "-"));
    }
    return all.filter(
      (t) => wanted.has(t.name) || wanted.has(t.name.replace(/_/g, "-")),
    );
  }
}
