'use client'

import { type UIMessage } from 'ai'
import { cn } from '@/lib/utils'
import { sanitizeText } from '@/lib/sanitize'
import { ChatToolCall } from './chat-tool-call'

type ChatMessageProps = {
  message: UIMessage
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant'

  return (
    <div
      className={cn(
        'mb-4',
        isAssistant ? 'flex justify-start' : 'flex justify-end'
      )}
    >
      <div
        className={cn(
          'rounded-2xl px-4 py-2.5 max-w-[80%] space-y-2',
          isAssistant
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
            : 'bg-blue-600 text-white rounded-br-sm'
        )}
      >
        {message.parts?.map((part, i) => {
          switch (part.type) {
            case 'text':
              return <span key={i}>{sanitizeText(part.text)}</span>

            case 'reasoning':
              return (
                <pre
                  key={i}
                  className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto"
                >
                  {part.text}
                </pre>
              )

            case 'source-url':
              return (
                <span key={`src-${i}`}>
                  {' '}[<a
                    href={part.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'underline',
                      isAssistant
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-blue-200'
                    )}
                  >
                    {part.title ?? new URL(part.url).hostname}
                  </a>]{' '}
                </span>
              )

            case 'source-document':
              return (
                <span key={`src-${i}`} className="text-xs opacity-70">
                  {' '}[{part.title ?? 'Document'}]{' '}
                </span>
              )

            case 'step-start':
              return i > 0 ? (
                <hr key={i} className="my-2 border-gray-300 dark:border-gray-600" />
              ) : null

            case 'tool-call':
              return (
                <ChatToolCall
                  key={`tc-${i}`}
                  toolName={(part as any).toolName || 'tool'}
                  state={(part as any).state || 'input-available'}
                  input={(part as any).input}
                />
              )
            case 'tool-result':
              return (
                <ChatToolCall
                  key={`tr-${i}`}
                  toolName={(part as any).toolName || 'tool'}
                  state={(part as any).state === 'error' ? 'output-error' : 'output-available'}
                  output={(part as any).output}
                  errorText={(part as any).errorText}
                />
              )

            case 'file':
              if (
                'mediaType' in part &&
                typeof part.mediaType === 'string' &&
                part.mediaType.startsWith('image/')
              ) {
                return (
                  <img
                    key={i}
                    src={(part as any).url}
                    alt={(part as any).filename ?? 'attachment'}
                    className="max-w-full rounded"
                  />
                )
              }
              return null

            default:
              return null
          }
        })}
      </div>
    </div>
  )
}
