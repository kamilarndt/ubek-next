import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import {
  sessionStore,
  projectStore,
  ragChunkStore,
  projectExtensionStore,
} from "@/lib/store";
import { createRateLimiter, getUserKey } from "@/lib/guardrails/rate-limiter";
import { scanInput } from "@/lib/guardrails/injection-detector";

const AGENT_API_KEY = process.env.AGENT_API_KEY;
const PI_AGENT_URL = process.env.PI_AGENT_URL || "http://localhost:4000";

const limiter = createRateLimiter(20, 60 * 1000);

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = process.env.JWT_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Service configuration error" },
      { status: 500 },
    );

  let payload: { chatId?: string; message: string; projectId?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!payload.message)
    return NextResponse.json({ error: "Message required" }, { status: 400 });

  let userSub: string;
  let payloadToken: any;
  try {
    payloadToken = await verifyToken(token, secret);
    userSub = payloadToken.sub;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate Limiter
  const key = getUserKey(req, payloadToken);
  const limit = limiter.check(key);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Injection Scan
  const messageScan = scanInput(payload.message);
  if (!messageScan.safe) {
    return NextResponse.json(
      { error: "Suspicious input detected" },
      { status: 400 },
    );
  }

  const { chatId, message, projectId } = payload;
  let session;
  if (chatId) {
    session = await sessionStore.findById(chatId);
    if (!session || session.userId !== userSub)
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
  } else {
    const { randomUUID } = await import("crypto");
    session = await sessionStore.create({
      id: randomUUID(),
      userId: userSub,
      projectId: projectId || null,
      title: message.slice(0, 80) || "Nowa rozmowa",
    });
  }

  // Determine enabled extensions for this project's tools (per-project extension assignment)
  let enabledExtensions: string[] = [];
  if (session.projectId) {
    try {
      const assignments = await projectExtensionStore.findByProjectId(
        session.projectId,
      );
      enabledExtensions = assignments.map((a: any) => a.extensionId);
    } catch (e) {
      console.error(
        `Failed to load project extensions for tools (projectId=${session.projectId}):`,
        e,
      );
    }
  }

  // Load project instructions if we have a projectId
  let systemPrompt: string | undefined;
  if (session.projectId && session.projectId !== "default") {
    const project = await projectStore.findById(session.projectId);
    if (project?.instructions) {
      systemPrompt = project.instructions;
    }
  }

  // Perform semantic search on the Knowledge Base if the project has RAG chunks
  let kbContext = "";
  if (session.projectId && session.projectId !== "default") {
    try {
      const chunks = await ragChunkStore.findByProjectId(session.projectId);
      if (chunks && chunks.length > 0) {
        const { embedText, searchChunks } = await import("@/lib/rag");
        const queryEmbedding = await embedText(message);
        const searchable = chunks.map((c) => ({
          id: c.id,
          text: c.content,
          embedding: (c.embedding as number[]) || [],
        }));
        const results = searchChunks(queryEmbedding, searchable, 5);
        if (results.length > 0) {
          kbContext =
            "\n\nKnowledge Base context:\n" +
            results.map((r) => r.text).join("\n---\n");
        }
      }
    } catch (err) {
      console.error("RAG semantic search error:", err);
    }
  }

  if (kbContext) {
    systemPrompt = systemPrompt
      ? `${systemPrompt}${kbContext}`
      : `Use the following context to answer questions:\n${kbContext}`;
  }

  // Retrieve chat history
  const history = (session.messages as any[]) || [];
  const userMessage = { role: "user", content: message };
  const fullMessages = [...history, userMessage];

  try {
    const upstreamRes = await fetch(`${PI_AGENT_URL}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-agent-api-key": AGENT_API_KEY || "",
      },
      body: JSON.stringify({
        message,
        chatId: session.id,
        projectId: session.projectId,
        enabledExtensions,
        systemPrompt,
        messages: fullMessages,
      }),
      signal: req.signal,
    });
    if (!upstreamRes.ok)
      return NextResponse.json(
        { error: `Upstream error: ${upstreamRes.status}` },
        { status: 502 },
      );
    const stream = upstreamRes.body;
    if (!stream)
      return NextResponse.json(
        { error: "Upstream missing body" },
        { status: 502 },
      );
    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "x-chat-session-id": session.id,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Upstream connection failed" },
      { status: 502 },
    );
  }
}
