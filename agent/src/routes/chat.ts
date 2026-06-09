import { Router, type Request, type Response } from "express";
import { SdkSseAdapter } from "../services/SdkSseAdapter";
import { UserSessionPool } from "../services/SessionPool";
import { ExtensionRegistry } from "../services/Registry";
import {
  callRouterLLM,
  parseSSEChunk,
  executeToolCalls,
  type ChatMessage,
} from "../services/chat-service";
import type { Config } from "../types";

const MAX_TOOL_ITERATIONS = 10;

function validateMessage(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("message must be a non-empty string");
  }
  if (value.length > 10000) {
    throw new Error("message exceeds maximum length");
  }
  return value;
}

function validateChatId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("chatId must be a non-empty string");
  }
  return value;
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, maxPerMinute = 30): void {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 });
    return;
  }
  if (entry.count >= maxPerMinute) {
    throw new Error("Rate limit exceeded. Try again later.");
  }
  entry.count++;
}

async function doStreamingCall(
  config: Config,
  messages: ChatMessage[],
  registry: ExtensionRegistry,
  adapter: SdkSseAdapter,
  userId: string,
  signal: AbortSignal,
  projectId: string | null = null,
  enabledExtensions: string[] = [],
): Promise<void> {
  const piSdk = await import("@earendil-works/pi-coding-agent");
  const {
    AuthStorage,
    ModelRegistry,
    createAgentSession,
    SessionManager,
    SettingsManager,
  } = piSdk;

  const authStorage = AuthStorage.create();
  authStorage.setRuntimeApiKey("router", config.router.apiKey);

  const modelRegistry = ModelRegistry.inMemory(authStorage);
  const baseUrl = config.router.url.endsWith("/v1")
    ? config.router.url
    : `${config.router.url.replace(/\/+$/, "")}/v1`;

  modelRegistry.registerProvider("router", {
    name: "Router LLM",
    baseUrl: baseUrl,
    apiKey: config.router.apiKey,
    api: "openai",
    models: [
      {
        id: config.router.model || "default",
        name: "Router LLM Model",
        api: "openai",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8192,
        maxTokens: 4096,
      },
    ],
  });

  const model = modelRegistry.find("router", config.router.model || "default");
  if (!model) {
    throw new Error(`Model not found: router/${config.router.model}`);
  }

  const toolsForProject = await registry.getToolsForProject(
    projectId || "",
    enabledExtensions,
  );
  const customTools = toolsForProject.map((t) => ({
    name: t.name,
    label: t.name.replace(/_/g, " "),
    description: t.description,
    parameters: t.parameters as any,
    execute: async (toolCallId: string, params: any) => {
      const result = await t.execute(params, { userId });
      return {
        content: result.content.map((c) => ({
          type: c.type as "text",
          text: c.text,
        })),
        details: {},
      };
    },
  }));
  // piToolsList must be consistent with customTools (the only place real execute + context is provided).
  // - enabledExtensions=[] (or absent) -> getToolsForProject returns all core (happy default path)
  // - enabled non-empty but 0 matches after normalization -> empty list (do not silently fallback names without wrappers)
  const piToolsList =
    toolsForProject.length > 0
      ? toolsForProject.map((t) => t.name)
      : enabledExtensions.length > 0
        ? []
        : ["web_search", "vision", "document_gen", "memory"];

  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: false },
    retry: { enabled: false },
  });

  const systemMsg =
    messages.find((m) => m.role === "system")?.content ||
    config.defaultSystemPrompt ||
    "";

  const resourceLoader = {
    getExtensions: () => ({
      extensions: [],
      errors: [],
      runtime: piSdk.createExtensionRuntime(),
    }),
    getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }),
    getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }),
    getSystemPrompt: () => systemMsg,
    getAppendSystemPrompt: () => [],
    extendResources: () => {},
    reload: async () => {},
  } as any;

  const { session } = await createAgentSession({
    cwd: process.cwd(),
    model,
    authStorage,
    modelRegistry,
    tools: piToolsList,
    customTools,
    sessionManager: SessionManager.inMemory(process.cwd()),
    settingsManager,
    resourceLoader,
  });

  if (signal.aborted) {
    session.dispose();
    return;
  }

  const abortHandler = () => {
    session.abort().catch(() => {});
  };
  signal.addEventListener("abort", abortHandler);

  try {
    session.subscribe((event) => {
      if (signal.aborted) return;

      if (
        event.type === "message_update" &&
        event.assistantMessageEvent.type === "text_delta"
      ) {
        adapter.handleEvent({
          type: "text",
          data: { text: event.assistantMessageEvent.delta },
        });
      } else if (event.type === "tool_execution_start") {
        adapter.handleEvent({
          type: "tool_call",
          data: { tool_name: event.toolName, input: event.args },
        });
      } else if (event.type === "tool_execution_end") {
        const textContent =
          event.result?.content?.map((c: any) => c.text || "").join("\n") || "";
        adapter.handleEvent({
          type: "tool_result",
          data: { tool_name: event.toolName, output: textContent },
        });
      }
    });

    const history = messages.slice(0, -1);
    const lastMessage = messages[messages.length - 1]?.content || "";

    const formattedHistory: any[] = history.map((m) => {
      if (m.role === "tool") {
        return {
          role: "tool",
          content: m.content,
          tool_call_id: m.tool_call_id || "unknown",
        };
      }
      return {
        role: m.role,
        content: m.content,
      };
    });

    session.state.messages = formattedHistory;

    await session.prompt(lastMessage);
  } finally {
    signal.removeEventListener("abort", abortHandler);
    session.dispose();
  }
}

export function createChatRouter(
  pool: UserSessionPool,
  config: Config,
): Router {
  const router = Router();

  router.post("/chat/stream", async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    try {
      checkRateLimit(userId);
    } catch {
      res.status(429).json({ error: "Rate limit exceeded. Try again later." });
      return;
    }

    let chatId: string;
    let message: string;
    const systemPrompt = req.body.systemPrompt;
    const projectId: string | null = req.body.projectId || null;
    const enabledExtensions: string[] = Array.isArray(
      req.body.enabledExtensions,
    )
      ? (req.body.enabledExtensions as any[]).filter(
          (x): x is string =>
            typeof x === "string" && x.length > 0 && x.length < 100,
        )
      : [];
    try {
      chatId = validateChatId(req.body.chatId);
      message = validateMessage(req.body.message);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Invalid request",
      });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const write = (chunk: string) => res.write(chunk);
    const end = () => res.end();
    const adapter = new SdkSseAdapter(write, end, chatId);

    const controller = new AbortController();
    if (typeof req.on === "function") {
      req.on("close", () => {
        controller.abort();
      });
    }

    // Hard safety timeout to bound token burn even if client disconnect + SDK abort is slow
    // (addresses "Denial of Wallet" risk on TCP drop during long reasoning/tool loops).
    const SAFETY_TIMEOUT_MS = 120_000; // 2 minutes per turn max
    const safetyTimer = setTimeout(() => {
      controller.abort();
    }, SAFETY_TIMEOUT_MS);

    try {
      // The pool is intended to provide long-lived per-user runtime (see SessionPool.ts and ARCHITECTURE).
      // We capture it here even if full reuse of Pi AgentSession is not yet wired into doStreamingCall.
      const runtime = await pool.getOrCreate(userId, {
        routerUrl: config.router.url,
        routerApiKey: config.router.apiKey,
        model: config.router.model,
      });
      // runtime.switchSession(...) would be used in a full pooled implementation.

      const registry = ExtensionRegistry.getInstance({
        extensionsPath: config.extensionsPath || "extensions",
      });
      const systemMessage = systemPrompt || config.defaultSystemPrompt;
      let messages: ChatMessage[];
      if (
        req.body.messages &&
        Array.isArray(req.body.messages) &&
        req.body.messages.length > 0
      ) {
        messages = req.body.messages;
        const hasSystem = messages.some((m) => m.role === "system");
        if (!hasSystem && systemMessage) {
          messages.unshift({ role: "system", content: systemMessage });
        }
      } else {
        messages = systemMessage
          ? [
              { role: "system", content: systemMessage },
              { role: "user", content: message },
            ]
          : [{ role: "user", content: message }];
      }

      adapter.handleEvent({ type: "start", data: { chatId } });
      await doStreamingCall(
        config,
        messages,
        registry,
        adapter,
        userId,
        controller.signal,
        projectId,
        enabledExtensions,
      );
      adapter.handleEvent({ type: "finish", data: { finish_reason: "stop" } });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      adapter.handleEvent({ type: "error", data: { message: errorMessage } });
    } finally {
      clearTimeout(safetyTimer);
    }
  });

  return router;
}
