'use client'

import { type ReactNode } from 'react'

type ChatConversationProps = {
  children: ReactNode
}

export function ChatConversation({ children }: ChatConversationProps) {
  return (
    <section className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-3xl mx-auto w-full">
      {children}
    </section>
  )
}
