'use client'

import { Send, Square } from 'lucide-react'
import { type FormEvent, type KeyboardEvent } from 'react'

type ChatInputProps = {
  value: string
  onChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  isLoading: boolean
  hasError?: boolean
  onStop: () => void
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  isLoading,
  hasError,
  onStop,
}: ChatInputProps) {
  const isDisabled = isLoading || hasError || !value.trim()

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl mx-auto w-full gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        disabled={isLoading || hasError}
        className="flex-1 bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        placeholder={hasError ? 'Fix the error before sending...' : 'Type a message...'}
      />
      <button
        type="submit"
        disabled={isDisabled}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-4 py-3 flex items-center"
      >
        <Send size={18} />
      </button>
      {isLoading && (
        <button
          type="button"
          onClick={onStop}
          className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-3 flex items-center"
        >
          <Square size={18} />
        </button>
      )}
    </form>
  )
}
