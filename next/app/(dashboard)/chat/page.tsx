'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, FormEvent, useMemo, useEffect } from 'react'
import { Send, Square, Plus, Trash2 } from 'lucide-react'

export default function ChatPage() {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat/stream' }), [])
  const { messages, sendMessage, status, stop } = useChat({ transport })

  const [input, setInput] = useState('')

  const [sessions, setSessions] = useState<Array<{ id: string; title: string; updatedAt: string }>>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')

  // Fetch sessions on mount
  useEffect(() => {
    fetch('/api/chat/sessions')
      .then((res) => res.json())
      .then((data) => {
        setSessions(data)
        if (data.length > 0) setSelectedSessionId(data[0].id)
      })
      .catch(console.error)
  }, [])

  const handleNewSession = async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nowa rozmowa' }),
      })
      const newSession = await res.json()
      setSessions((prev) => [newSession, ...prev])
      setSelectedSessionId(newSession.id)
    } catch (e) {
      console.error(e)
    }
  }

  const isLoading = status === 'submitted' || status === 'streaming'

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex h-full">
      {/* Session list sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-2 bg-white dark:bg-gray-950">
        <div className="flex items-center justify-between mb-2 px-2">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sessions</h2>
          <button
            onClick={handleNewSession}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            aria-label="New chat"
          >
            <Plus size={16} />
          </button>
        </div>
        <ul className="space-y-1">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setSelectedSessionId(s.id)}
                className={`w-full text-left px-2 py-1 rounded-md flex justify-between items-center ${
                  s.id === selectedSessionId ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="truncate max-w-xs text-sm font-medium" title={s.title}>{s.title}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400" title={new Date(s.updatedAt).toLocaleString()}>{new Date(s.updatedAt).toLocaleDateString()}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex flex-col flex-1">
        <section className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-3xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500">Start a conversation</div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === 'assistant'
                  ? 'flex justify-start mb-4'
                  : 'flex justify-end mb-4'
              }
            >
              <div
                className={
                  msg.role === 'assistant'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[80%]'
                    : 'bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]'
                }
              >
                {msg.parts?.map((part, i) =>
                  part.type === 'text' ? <span key={i}>{part.text}</span> : null
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="flex space-x-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </section>

        <footer className="sticky bottom-0 border-t dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <form onSubmit={handleSubmit} className="flex max-w-3xl mx-auto w-full gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="flex-1 bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Type a message..."
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-4 py-3 flex items-center"
            >
              <Send size={18} />
            </button>
            {isLoading && (
              <button
                type="button"
                onClick={stop}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-3 flex items-center"
              >
                <Square size={18} />
              </button>
            )}
          </form>
        </footer>
      </div>
    </div>
  )
}
