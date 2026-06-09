import { describe, it, expect, beforeEach } from "vitest";
import { ExtensionRegistry } from "../services/Registry";

describe("ExtensionRegistry", () => {
  beforeEach(() => {
    ExtensionRegistry.reset();
  });

  it("should load core tools from extensions path", async () => {
    const registry = ExtensionRegistry.getInstance({
      extensionsPath: "/home/kamil/projects/ubek-next/extensions",
    });

    const tools = await registry.loadCoreTools();

    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThanOrEqual(4);
    const names = tools.map((t) => t.name);
    expect(names).toContain("web_search");
    expect(names).toContain("vision");
    expect(names).toContain("document_gen");
    expect(names).toContain("memory");
  });

  it("should cache tools after first load", async () => {
    const registry = ExtensionRegistry.getInstance({
      extensionsPath: "/home/kamil/projects/ubek-next/extensions",
    });

    const tools1 = await registry.loadCoreTools();
    const tools2 = await registry.loadCoreTools();

    expect(tools1).toBe(tools2); // same cached instance
  });

  it("should filter tool definitions by project (returns subset when names provided)", async () => {
    const registry = ExtensionRegistry.getInstance({
      extensionsPath: "/home/kamil/projects/ubek-next/extensions",
    });

    const tools = await registry.getToolsForProject("project-1", [
      "web_search",
      "vision",
    ]);

    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBe(2);
    const names = tools.map((t) => t.name);
    expect(names).toContain("web_search");
    expect(names).toContain("vision");
  });
});
