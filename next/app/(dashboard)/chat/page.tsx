'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, FormEvent, useMemo } from 'react'
import { Send, Square } from 'lucide-react'

export default function ChatPage() {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat/stream' }), [])
  const { messages, sendMessage, status, stop } = useChat({ transport })

  const [input, setInput] = useState('')

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
    <div className="flex flex-col h-full">
      <section className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            Start a conversation
          </div>
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
  )
}
