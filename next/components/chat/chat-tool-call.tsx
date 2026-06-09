'use client'

import { cn } from '@/lib/utils'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

interface ToolCallProps {
  toolName: string
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  input?: any
  output?: any
  errorText?: string
}

export function ChatToolCall({ toolName, state, input, output, errorText }: ToolCallProps) {
  return (
    <div className={cn(
      'my-2 p-3 rounded-lg border text-sm',
      'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700',
    )}>
      <div className="flex items-center gap-2 mb-1">
        {state === 'input-streaming' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        {state === 'output-available' && <CheckCircle className="w-4 h-4 text-green-500" />}
        {state === 'output-error' && <XCircle className="w-4 h-4 text-red-500" />}
        <span className="font-mono text-xs font-medium">{toolName}</span>
        <span className="text-xs text-muted-foreground">{state}</span>
      </div>
      {input && (state === 'input-available' || state === 'input-streaming') && (
        <pre className="text-xs mt-1 overflow-x-auto">{JSON.stringify(input, null, 1)}</pre>
      )}
      {output && state === 'output-available' && (
        <pre className="text-xs mt-1 text-green-700 dark:text-green-300 overflow-x-auto">
          {typeof output === 'string' ? output : JSON.stringify(output, null, 1)}
        </pre>
      )}
      {errorText && (
        <p className="text-xs mt-1 text-red-500">{errorText}</p>
      )}
    </div>
  )
}