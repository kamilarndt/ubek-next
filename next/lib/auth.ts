import jwt, { type SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'



const SALT_ROUNDS = 10

export interface TokenPayload {
  sub: string
  role?: string
  exp?: number
  [key: string]: unknown
}

export async function signToken(
  payload: TokenPayload,
  secret: string,
  options?: { expiresIn?: string | number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const expiresIn = (options?.expiresIn ?? 86400) as SignOptions['expiresIn']
    jwt.sign(
      payload,
      secret,
      { expiresIn },
      (err, token) => {
        if (err) reject(err)
        else resolve(token as string)
      },
    )
  })
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function base64urlToUint8Array(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<TokenPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signatureBytes = base64urlToUint8Array(signatureB64);

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes as any,
    data
  );

  if (!isValid) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(base64urlDecode(payloadB64)) as TokenPayload;
  if (payload.exp && Date.now() / 1000 >= payload.exp) {
    throw new Error('Token expired');
  }
  return payload;
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
