import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockList = vi.fn().mockResolvedValue([]);
const mockUpdateStatus = vi.fn();
const mockExtList = vi.fn().mockResolvedValue([]);

vi.mock("@/lib/store", () => ({
  extensionRequestStore: { list: mockList, updateStatus: mockUpdateStatus },
  extensionStore: { list: mockExtList },
  projectExtensionStore: { findByProjectId: vi.fn().mockResolvedValue([]) },
}));

describe("Admin API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /api/admin/extension-requests should return list", async () => {
    const { GET } = await import("@/app/api/admin/extension-requests/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("POST should reject missing fields", async () => {
    const { POST } = await import("@/app/api/admin/extension-requests/route");
    const req = new NextRequest("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("GET /api/extensions should return list", async () => {
    const { GET } = await import("@/app/api/extensions/route");
    const res = await GET(new Request("http://localhost/api/extensions"));
    expect(res.status).toBe(200);
  });

  it("GET /api/extensions?projectId=... returns raw assignments (even [])", async () => {
    const { GET } = await import("@/app/api/extensions/route");
    const res = await GET(
      new Request("http://localhost/api/extensions?projectId=p1"),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    // with projectExtensionStore mock returning [], and no real rows, this exercises the raw [] path (no fallthrough)
  });
});
