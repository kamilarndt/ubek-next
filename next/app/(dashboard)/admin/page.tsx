'use client'

import { useState, useEffect, useCallback } from 'react'
import { Puzzle, CheckCircle, XCircle, Clock, Plus, Filter, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

// Mock API response structure matching the database schema
type ExtensionRequest = {
  id: string
  userId: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'approved' | 'rejected'
  adminNotes?: string
  createdAt: string
  updatedAt: string
}

type Tab = 'All' | 'Pending' | 'Approved' | 'Rejected'

export default function AdminExtensionRequests() {
  const [requests, setRequests] = useState<ExtensionRequest[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({})

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/extension-requests', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load requests')
      const data = (await res.json()) as ExtensionRequest[]
      setRequests(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const filtered = requests.filter((r) => {
    if (activeTab !== 'All' && r.status !== activeTab.toLowerCase()) return false
    return true
  })

  async function handleApprove(id: string) {
    try {
      setUpdatingStatus((prev) => ({ ...prev, [id]: true }))
      setError(null)
      const res = await fetch('/api/admin/extension-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, status: 'approved' }),
      })
      if (!res.ok) throw new Error('Failed to update request')
      const updated = (await res.json()) as ExtensionRequest
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setUpdatingStatus((prev) => ({ ...prev, [id]: false }))
    }
  }

  async function handleReject(id: string) {
    try {
      setUpdatingStatus((prev) => ({ ...prev, [id]: true }))
      setError(null)
      const res = await fetch('/api/admin/extension-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, status: 'rejected' }),
      })
      if (!res.ok) throw new Error('Failed to update request')
      const updated = (await res.json()) as ExtensionRequest
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject')
    } finally {
      setUpdatingStatus((prev) => ({ ...prev, [id]: false }))
    }
  }

    async function handleAddRequest(e: React.FormEvent) {
      e.preventDefault()
      try {
        setCreating(true)
        setError(null)
        // Mock creation — API doesn't support create yet
        const created: ExtensionRequest = {
          id: `${Date.now()}`,
          userId: 'current-user',
          title: newTitle,
          description: newDescription,
          status: 'pending',
          priority: newPriority,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setRequests((prev) => [created, ...prev])
        setNewTitle('')
        setNewDescription('')
        setNewPriority('medium')
        setShowForm(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create request')
      } finally {
        setCreating(false)
      }
    }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 flex-1 overflow-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Extension Requests
        </h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
            'bg-blue-600 text-white hover:bg-blue-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          )}
        >
          <Plus className="h-4 w-4" /> New request
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300 flex-1">
            {error}
          </span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
            aria-label="Dismiss error"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New request form */}
      {showForm && (
        <form
          onSubmit={handleAddRequest}
          className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className={cn(
                'w-full rounded-md border border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                'px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as any)}
              className={cn(
                'w-full rounded-md border border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                'px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
            >
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
          </div>
          <textarea
            required
            placeholder="Description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={3}
            className={cn(
              'w-full rounded-md border border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
              'px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-md',
                'bg-green-600 text-white hover:bg-green-700',
                'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Add request
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex space-x-4 mb-4">
        {(['All', 'Pending', 'Approved', 'Rejected'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium',
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
          <Puzzle className="h-12 w-12 mb-4" />
          <p className="text-lg">No extension requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 p-4 flex flex-col md:flex-row justify-between items-start md:items-center"
            >
              <div className="flex-1 mb-3 md:mb-0">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {req.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {req.description}
                </p>
                <div className="mt-2 flex items-center space-x-2 text-sm">
                  {/* Priority badge */}
                  <span
                    className={cn(
                      'font-medium',
                      req.priority === 'high' && 'text-red-600',
                      req.priority === 'medium' && 'text-yellow-600',
                      req.priority === 'low' && 'text-gray-500'
                    )}
                  >
                    {req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}
                  </span>
                  {/* Status badge */}
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-semibold',
                      req.status === 'pending' &&
                        'bg-yellow-100 text-yellow-800',
                      req.status === 'approved' &&
                        'bg-green-100 text-green-800',
                      req.status === 'rejected' &&
                        'bg-red-100 text-red-800'
                    )}
                  >
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex space-x-2 mt-2 md:mt-0">
                {req.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={updatingStatus[req.id]}
                      className="flex items-center gap-1 px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingStatus[req.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={updatingStatus[req.id]}
                      className="flex items-center gap-1 px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingStatus[req.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
