"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, FormEvent, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChatMessage,
  ChatInput,
  ChatShimmer,
  ChatConversation,
} from "@/components/chat";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project") || undefined;

  const [sessions, setSessions] = useState<
    Array<{ id: string; title: string; updatedAt: string }>
  >([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [input, setInput] = useState("");

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat/stream" }),
    [],
  );
  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    regenerate,
    setMessages,
  } = useChat({
    id: selectedSessionId,
    transport,
    body: {
      chatId: selectedSessionId,
      ...(projectId ? { projectId } : {}),
    },
    onFinish: async (result: any) => {
      if (selectedSessionId) {
        try {
          const hasLast = messages.some((m) => m.id === result.message.id);
          const updatedMessages = hasLast
            ? messages
            : [...messages, result.message];
          await fetch(`/api/chat/sessions/${selectedSessionId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ messages: updatedMessages }),
          });
        } catch (e) {
          // Client-side: use safe pattern (no full error dump in production logs if aggregated)
          console.error("Failed to persist chat messages:", e instanceof Error ? e.message : String(e));
        }
      }
    },
  } as any);

  // Fetch sessions on mount
  useEffect(() => {
    fetch("/api/chat/sessions", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load sessions");
        return res.json();
      })
      .then((data) => {
        setSessions(data);
        if (data.length > 0) setSelectedSessionId(data[0].id);
      })
      .catch(console.error);
  }, []);

  // Load messages when selectedSessionId changes
  useEffect(() => {
    if (!selectedSessionId) return;

    fetch(`/api/chat/sessions/${selectedSessionId}/messages`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load messages");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
        } else {
          setMessages([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load session messages:", err);
        setMessages([]);
      });
  }, [selectedSessionId, setMessages]);

  const handleNewSession = async () => {
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: "Nowa rozmowa",
          ...(projectId ? { projectId } : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const newSession = await res.json();
      setSessions((prev) => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
    } catch (e) {
      console.error(e);
    }
  };

  const isReady = status === "ready";
  const isLoading = status === "submitted" || status === "streaming";
  const hasError = error != null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-full">
      {/* Session list sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-2 bg-white dark:bg-gray-950">
        <div className="flex items-center justify-between mb-2 px-2">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sessions
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewSession}
            aria-label="New chat"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <ul className="space-y-1">
          {sessions.map((s) => (
            <li key={s.id}>
              <Button
                variant="ghost"
                className={`w-full justify-between text-left px-2 py-1 h-auto ${
                  s.id === selectedSessionId
                    ? "bg-blue-100 dark:bg-blue-900"
                    : ""
                }`}
                onClick={() => setSelectedSessionId(s.id)}
              >
                <span
                  className="truncate max-w-xs text-sm font-medium"
                  title={s.title}
                >
                  {s.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.updatedAt).toLocaleDateString()}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex flex-col flex-1">
        <section className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-3xl mx-auto w-full">
          <ChatConversation>
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-500">
                Start a conversation
              </div>
            )}
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && <ChatShimmer />}

            {/* Error state with retry — AI SDK pattern */}
            {hasError && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="text-sm text-red-500 dark:text-red-400">
                  An error occurred. Please try again.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => regenerate()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
              </div>
            )}
          </ChatConversation>
        </section>

        <footer className="sticky bottom-0 border-t dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            isLoading={isLoading}
            hasError={hasError}
            onStop={stop}
          />
        </footer>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-gray-950 min-h-screen">
          <div className="text-sm text-gray-500">Loading chat...</div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
