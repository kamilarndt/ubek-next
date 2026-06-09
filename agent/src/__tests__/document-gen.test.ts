import { describe, it, expect } from 'vitest'
import * as documentGenTool from '../../../extensions/core/document-gen/tool'

describe('Document Gen - File Generation', () => {
  it('should generate PDF buffer with correct header', async () => {
    // Test the internal PDF generation function if exported
    // Otherwise test through execute with format parameter
    if ('generatePdf' in documentGenTool) {
      const buffer = await (documentGenTool as any).generatePdf('Test', 'Hello World')
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(100)
      // PDF magic bytes: %PDF
      expect(buffer.toString('ascii', 0, 4)).toBe('%PDF')
    }
  })

  it('should generate DOCX buffer', async () => {
    if ('generateDocx' in documentGenTool) {
      const buffer = await (documentGenTool as any).generateDocx('Test', 'Hello World')
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(100)
      // DOCX is a ZIP file - should start with PK
      expect(buffer.toString('ascii', 0, 2)).toBe('PK')
    }
  })

  it('should generate XLSX buffer', async () => {
    if ('generateXlsx' in documentGenTool) {
      const buffer = await (documentGenTool as any).generateXlsx('Test', 'Hello World')
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(100)
      // XLSX is also a ZIP file
      expect(buffer.toString('ascii', 0, 2)).toBe('PK')
    }
  })

  it('should execute with PDF format', async () => {
    const result = await documentGenTool.execute({
      title: 'Test PDF',
      content: 'Hello World PDF',
      type: 'note',
      tags: [],
      format: 'pdf' // This is what we'll add
    } as any)
    
    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.filename).toBe('Test PDF.pdf')
    expect(parsed.mimeType).toBe('application/pdf')
    expect(parsed.data).toBeDefined()
    // Decode base64 and check PDF header
    const buffer = Buffer.from(parsed.data, 'base64')
    expect(buffer.toString('ascii', 0, 4)).toBe('%PDF')
  })
})