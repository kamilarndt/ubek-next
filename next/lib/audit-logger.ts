import { auditLogStore } from '@/lib/store'

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_REGISTER'
  | 'CHAT_MESSAGE'
  | 'PROJECT_CREATE'
  | 'PROJECT_DELETE'
  | 'VAULT_UPLOAD'
  | 'VAULT_DELETE'
  | 'EXTENSION_REQUEST'
  | 'ADMIN_ACTION'

export async function logAudit(params: {
  userId: string
  action: AuditAction
  resource?: string
  resourceId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    await auditLogStore.create({
      userId: params.userId,
      action: params.action,
      metadata: {
        ...params.metadata,
        resource: params.resource,
        resourceId: params.resourceId,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const { logError } = await import('@/lib/safe-log')
    logError('audit', error)
  }
}