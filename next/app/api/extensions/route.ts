import { NextResponse } from "next/server";
import { extensionStore, projectExtensionStore } from "@/lib/store";

const CORE_EXTENSIONS = [
  {
    id: "web-search",
    name: "Web Search",
    description: "Search the web for current information",
    hasUi: false,
    icon: "puzzle",
  },
  {
    id: "vision",
    name: "Vision",
    description: "Analyze an image from a URL",
    hasUi: false,
    icon: "puzzle",
  },
  {
    id: "document-gen",
    name: "Document Gen",
    description: "Generate documents in markdown format",
    hasUi: false,
    icon: "puzzle",
  },
  {
    id: "memory",
    name: "Memory",
    description: "Store and retrieve information from long-term memory",
    hasUi: false,
    icon: "puzzle",
  },
];

async function requireProjectOwnership(projectId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token, process.env.JWT_SECRET);
  const userId = payload.sub;
  const project = await projectStore.findById(projectId);
  if (!project || project.userId !== userId) return null;
  return userId;
}

async function ensureCoreExtensions() {
  try {
    const existing = await extensionStore.list();
    const ids = new Set(existing.map((e: any) => e.id));
    for (const c of CORE_EXTENSIONS) {
      if (!ids.has(c.id)) {
        try {
          await extensionStore.create(c);
        } catch {
          // ignore duplicate key or race
        }
      }
    }
  } catch {
    // ignore if DB not ready
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");

  await ensureCoreExtensions();

  if (projectId) {
    const assignments = await projectExtensionStore.findByProjectId(projectId);
    // Always return precisely the assigned extensions for this project (raw list, possibly empty []).
    // Default-all core behavior for chat/tools lives in Registry.getToolsForProject([]) + sidebar fallback on error.
    // This ensures admin "assignedIds" and sidebar accurately reflect DB rows, fixing 0-assignment false-positives.
    const exts: any[] = await Promise.all(
      assignments.map((ass) =>
        extensionStore.findById(ass.extensionId).then((e) => e || null),
      ),
    ).then((list) => list.filter(Boolean));
    return NextResponse.json(exts);
  }

  const extensions = await extensionStore.list();
  return NextResponse.json(extensions);
}

// /api/extensions to explicit admin guard.

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { projectId, extensionId } = body || {};
  const ownerUserId = await requireProjectOwnership(projectId);
  if (!ownerUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!projectId || !extensionId) {
    return NextResponse.json(
      { error: "projectId and extensionId required" },
      { status: 400 },
    );
  }
  await ensureCoreExtensions();
  try {
    const ext = await extensionStore.findById(extensionId);
    if (!ext) {
      return NextResponse.json(
        { error: "Extension not found" },
        { status: 404 },
      );
    }
    const created = await projectExtensionStore.create({
      projectId,
      extensionId,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to assign extension" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const extensionId = url.searchParams.get("extensionId");
  if (!projectId || !extensionId) {
    return NextResponse.json(
      { error: "projectId and extensionId required" },
      { status: 400 },
    );
  }
  await ensureCoreExtensions();
  try {
    await projectExtensionStore.delete(projectId, extensionId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to unassign extension" },
      { status: 500 },
    );
  }
}
