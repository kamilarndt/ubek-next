import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export function createAuthMiddleware(
  jwtSecret: string,
  agentApiKey: string,
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const apiKey = req.headers['x-agent-api-key'] as string
    if (!apiKey || apiKey !== agentApiKey) {
      res.status(401).json({ error: 'Invalid or missing AGENT_API_KEY' })
      return
    }

    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' })
      return
    }

    const token = authHeader.slice(7)
    try {
      const decoded = jwt.verify(token, jwtSecret) as { sub: string }
      ;(req as any).userId = decoded.sub
      next()
    } catch {
      res.status(401).json({ error: 'Invalid or expired JWT' })
    }
  }
}
