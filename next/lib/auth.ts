import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export interface TokenPayload {
  sub: string
  role?: string
  [key: string]: unknown
}

export async function signToken(
  payload: TokenPayload,
  secret: string,
  options?: { expiresIn?: string },
): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      secret,
      { expiresIn: options?.expiresIn || '24h' },
      (err, token) => {
        if (err) reject(err)
        else resolve(token as string)
      },
    )
  })
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<TokenPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) reject(err)
      else resolve(decoded as TokenPayload)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
