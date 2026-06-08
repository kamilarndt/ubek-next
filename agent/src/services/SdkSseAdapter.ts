import {
  sendAISDKStart,
  sendAISDKTextDelta,
  sendAISDKTextEnd,
  sendAISDKReasoningDelta,
  sendAISDKReasoningEnd,
  sendAISDKToolInput,
  sendAISDKToolOutput,
  sendAISDKFinish,
  sendAISDKError,
} from '../utils/sse'

interface PiSDKEvent {
  type: string
  data: Record<string, unknown>
}

export class SdkSseAdapter {
  private hasStarted = false
  private textBlockOpen = false
  private reasoningBlockOpen = false

  constructor(
    private write: (chunk: string) => void,
    private end: () => void,
    private messageId: string = `msg-${Date.now()}`,
  ) {}

  handleEvent(event: PiSDKEvent): void {
    switch (event.type) {
      case 'text':
        this.handleText(event.data as { text: string })
        break
      case 'reasoning':
        this.handleReasoning(event.data as { content: string })
        break
      case 'tool_call':
        this.handleToolCall(
          event.data as { tool_name: string; input: unknown },
        )
        break
      case 'tool_result':
        this.handleToolResult(
          event.data as { tool_name: string; output: unknown },
        )
        break
      case 'finish':
        this.handleFinish(event.data as { finish_reason?: string })
        break
      case 'error':
        this.handleError(event.data as { message?: string })
        break
    }
  }

  private ensureStarted(): void {
    if (!this.hasStarted) {
      sendAISDKStart(this.write, this.messageId)
      this.hasStarted = true
    }
  }

  private openTextBlock(): void {
    this.ensureStarted()
    if (!this.textBlockOpen) {
      this.textBlockOpen = true
    }
  }

  private closeTextBlock(): void {
    if (this.textBlockOpen) {
      sendAISDKTextEnd(this.write)
      this.textBlockOpen = false
    }
  }

  private handleText(data: { text: string }): void {
    this.openTextBlock()
    sendAISDKTextDelta(this.write, data.text)
  }

  private handleReasoning(data: { content: string }): void {
    this.ensureStarted()
    if (!this.reasoningBlockOpen) {
      this.reasoningBlockOpen = true
    }
    sendAISDKReasoningDelta(this.write, data.content)
  }

  private handleToolCall(data: { tool_name: string; input: unknown }): void {
    this.closeTextBlock()
    this.ensureStarted()
    sendAISDKToolInput(this.write, data.tool_name, data.input)
  }

  private handleToolResult(data: { tool_name: string; output: unknown }): void {
    this.ensureStarted()
    sendAISDKToolOutput(this.write, data.tool_name, data.output)
  }

  private handleFinish(data: { finish_reason?: string }): void {
    if (this.reasoningBlockOpen) {
      sendAISDKReasoningEnd(this.write)
      this.reasoningBlockOpen = false
    }
    this.closeTextBlock()
    this.ensureStarted()
    sendAISDKFinish(this.write, this.end, data.finish_reason || 'stop')
  }

  private handleError(data: { message?: string }): void {
    this.ensureStarted()
    sendAISDKError(this.write, data.message || 'Unknown error')
  }
}
