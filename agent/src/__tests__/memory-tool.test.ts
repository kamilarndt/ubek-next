import { describe, it, expect, beforeEach } from 'vitest'
import * as memoryTool from '../../../extensions/core/memory/tool'

describe('Memory Tool — per-user isolation', () => {
  it('should store and retrieve a value for a user', async () => {
    const result = await memoryTool.execute(
      { action: 'store', key: 'name', value: 'Alice' },
      { userId: 'user-1' },
    )
    expect(result.content[0].text).toContain('Stored memory')
  })

  it('should retrieve stored value for the same user', async () => {
    await memoryTool.execute(
      { action: 'store', key: 'city', value: 'Warsaw' },
      { userId: 'user-1' },
    )

    const result = await memoryTool.execute(
      { action: 'retrieve', key: 'city' },
      { userId: 'user-1' },
    )
    expect(result.content[0].text).toContain('Warsaw')
  })

  it('should keep memory isolated between users', async () => {
    // Store for user-1
    await memoryTool.execute(
      { action: 'store', key: 'secret', value: 'user-1-data' },
      { userId: 'user-1' },
    )

    // Retrieve for user-2 — should NOT see user-1's data
    const result = await memoryTool.execute(
      { action: 'retrieve', key: 'secret' },
      { userId: 'user-2' },
    )
    expect(result.content[0].text).toContain('No memory found')
  })

  it('should list all keys for a user', async () => {
    await memoryTool.execute(
      { action: 'store', key: 'a', value: '1' },
      { userId: 'user-list' },
    )
    await memoryTool.execute(
      { action: 'store', key: 'b', value: '2' },
      { userId: 'user-list' },
    )

    const result = await memoryTool.execute(
      { action: 'list', key: '_list_all' },
      { userId: 'user-list' },
    )
    expect(result.content[0].text).toContain('a')
    expect(result.content[0].text).toContain('b')
  })

  it('should delete a key for a user', async () => {
    await memoryTool.execute(
      { action: 'store', key: 'temp', value: 'data' },
      { userId: 'user-del' },
    )

    const result = await memoryTool.execute(
      { action: 'delete', key: 'temp' },
      { userId: 'user-del' },
    )
    expect(result.content[0].text).toContain('Deleted memory')
  })

  it('should return error for store action without value', async () => {
    const result = await memoryTool.execute(
      { action: 'store', key: 'x' },
      { userId: 'user-1' },
    )
    expect(result.content[0].text).toContain('Error')
  })

  it('should use default user scope when no userId provided', async () => {
    const result = await memoryTool.execute(
      { action: 'store', key: 'default_key', value: 'default_val' },
    )
    expect(result.content[0].text).toContain('Stored memory')
  })

  it('should return "No memory found" for missing key', async () => {
    const result = await memoryTool.execute(
      { action: 'retrieve', key: 'nonexistent' },
      { userId: 'user-empty' },
    )
    expect(result.content[0].text).toContain('No memory found')
  })
})
