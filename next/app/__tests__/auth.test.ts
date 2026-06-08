import { describe, it, expect } from 'vitest'
import { signToken, verifyToken, hashPassword, comparePassword } from '@/lib/auth'

describe('Auth Library', () => {
  const testSecret = 'test-secret-key-for-testing'

  it('should sign and verify a JWT', async () => {
    const token = await signToken({ sub: 'user-1', role: 'user' }, testSecret)
    expect(token).toBeTruthy()

    const payload = await verifyToken(token, testSecret)
    expect(payload.sub).toBe('user-1')
    expect(payload.role).toBe('user')
  })

  it('should reject invalid JWT', async () => {
    await expect(
      verifyToken('invalid-token', testSecret),
    ).rejects.toThrow()
  })

  it('should reject JWT signed with different secret', async () => {
    const token = await signToken({ sub: 'user-1' }, 'other-secret')
    await expect(
      verifyToken(token, testSecret),
    ).rejects.toThrow()
  })

  it('should hash and compare passwords', async () => {
    const password = 'my-password-123'
    const hash = await hashPassword(password)
    expect(hash).not.toBe(password)

    const match = await comparePassword(password, hash)
    expect(match).toBe(true)
  })

  it('should reject wrong password', async () => {
    const hash = await hashPassword('correct-password')
    const match = await comparePassword('wrong-password', hash)
    expect(match).toBe(false)
  })

  it('should reject expired JWT', async () => {
    const token = await signToken(
      { sub: 'user-1' },
      testSecret,
      { expiresIn: '0s' },
    )

    await new Promise((r) => setTimeout(r, 100))

    await expect(
      verifyToken(token, testSecret),
    ).rejects.toThrow()
  })
})
