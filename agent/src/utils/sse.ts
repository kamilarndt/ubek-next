export function sendAISDKStart(
  write: (chunk: string) => void,
  messageId: string,
): void {
  write(
    `data: ${JSON.stringify({
      type: 'start',
      messageId,
    })}\n\n`,
  )
}

export function sendAISDKTextDelta(
  write: (chunk: string) => void,
  text: string,
): void {
  write(
    `data: ${JSON.stringify({
      type: 'text-delta',
      text,
    })}\n\n`,
  )
}

export function sendAISDKTextEnd(write: (chunk: string) => void): void {
  write(
    `data: ${JSON.stringify({
      type: 'text-end',
    })}\n\n`,
  )
}

export function sendAISDKReasoningDelta(
  write: (chunk: string) => void,
  content: string,
): void {
  write(
    `data: ${JSON.stringify({
      type: 'reasoning-delta',
      content,
    })}\n\n`,
  )
}

export function sendAISDKReasoningEnd(write: (chunk: string) => void): void {
  write(
    `data: ${JSON.stringify({
      type: 'reasoning-end',
    })}\n\n`,
  )
}

export function sendAISDKToolInput(
  write: (chunk: string) => void,
  toolName: string,
  input: unknown,
): void {
  write(
    `data: ${JSON.stringify({
      type: 'tool-input-available',
      toolName,
      input,
    })}\n\n`,
  )
}

export function sendAISDKToolOutput(
  write: (chunk: string) => void,
  toolName: string,
  output: unknown,
): void {
  write(
    `data: ${JSON.stringify({
      type: 'tool-output-available',
      toolName,
      output,
    })}\n\n`,
  )
}

export function sendAISDKFinish(
  write: (chunk: string) => void,
  end: () => void,
  finishReason: string = 'stop',
): void {
  write(
    `data: ${JSON.stringify({
      type: 'finish',
      finishReason,
    })}\n\n`,
  )
  write('data: [DONE]\n\n')
  end()
}

export function sendAISDKError(
  write: (chunk: string) => void,
  error: string,
): void {
  write(
    `data: ${JSON.stringify({
      type: 'error',
      error,
    })}\n\n`,
  )
}
