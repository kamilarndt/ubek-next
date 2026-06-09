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
import { getConfig } from "@/lib/config";

const config = getConfig();
const AGENT_API_KEY = config.agentApiKey;
const PI_AGENT_URL = config.piAgentUrl;

const limiter = createRateLimiter(20, 60 * 1000);

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = config.jwtSecret;
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

  // Extracted helper to keep the route handler thinner (layering / fat controller reduction).
  async function getOrCreateSessionWithInitialMessage(
    chatId: string | undefined,
    userSub: string,
    message: string,
    projectId?: string,
  ) {
    if (chatId) {
      const s = await sessionStore.findById(chatId);
      if (!s || s.userId !== userSub) throw new Error('Not Found');
      return s;
    }
    const { randomUUID } = await import('crypto');
    const initialMessages = [{ role: 'user', content: message }];
    return await sessionStore.create({
      id: randomUUID(),
      userId: userSub,
      projectId: projectId || null,
      title: message.slice(0, 80) || 'Nowa rozmowa',
      messages: initialMessages,
    });
  }

  let session;
  try {
    session = await getOrCreateSessionWithInitialMessage(chatId, userSub, message, projectId);
  } catch (e: any) {
    const status = e.message === 'Not Found' ? 404 : 401;
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status });
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
      const { logError } = await import('@/lib/safe-log')
      logError('chat/stream/extensions', e, { projectId: session.projectId })
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
  // Extracted for testability and to keep the route thinner (layering improvement).
  async function loadKbContext(projectId: string, userMessage: string): Promise<string> {
    try {
      const chunks = await ragChunkStore.findByProjectId(projectId);
      if (!chunks || chunks.length === 0) return "";
      const { embedText, searchChunks } = await import("@/lib/rag");
      const queryEmbedding = await embedText(userMessage);
      const searchable = chunks.map((c) => ({
        id: c.id,
        text: c.content,
        embedding: (c.embedding as number[]) || [],
      }));
      const results = searchChunks(queryEmbedding, searchable, 5);
      if (results.length === 0) return "";
      return "\n\nKnowledge Base context:\n" + results.map((r) => r.text).join("\n---\n");
    } catch (err) {
      const { logError } = await import('@/lib/safe-log')
      logError('chat/stream/rag', err)
      return "";
    }
  }

  let kbContext = "";
  if (session.projectId && session.projectId !== "default") {
    kbContext = await loadKbContext(session.projectId, message);
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
