'use client'

import { useState } from 'react'
import { Puzzle, CheckCircle, XCircle, Clock, Plus, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

// Placeholder data
const initialRequests = [
  {
    id: '1',
    title: 'GitHub Integration',
    description: 'Connect with GitHub repos',
    status: 'pending',
    priority: 'high',
    date: '2026-01-10',
  },
  {
    id: '2',
    title: 'Slack Bot',
    description: 'Post summaries to Slack',
    status: 'approved',
    priority: 'medium',
    date: '2026-01-08',
  },
  {
    id: '3',
    title: 'Weather Tool',
    description: 'Get weather data',
    status: 'rejected',
    priority: 'low',
    date: '2026-01-05',
  },
]

type Request = typeof initialRequests[number]

type Tab = 'All' | 'Pending' | 'Approved' | 'Rejected'

export default function AdminExtensionRequests() {
  const [requests, setRequests] = useState<Request[]>(initialRequests)
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium')

  const filtered = requests.filter((r) => {
    if (activeTab !== 'All' && r.status !== activeTab.toLowerCase()) return false
    return true
  })

  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r))
    )
  }
  const handleReject = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r))
    )
  }

  const handleAddRequest = (e: React.FormEvent) => {
    e.preventDefault()
    const newReq: Request = {
      id: `${Date.now()}`,
      title: newTitle,
      description: newDescription,
      status: 'pending',
      priority: newPriority,
      date: new Date().toISOString().split('T')[0],
    }
    setRequests((prev) => [newReq, ...prev])
    setNewTitle('')
    setNewDescription('')
    setNewPriority('medium')
    setShowForm(false)
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
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-md',
                'bg-green-600 text-white hover:bg-green-700',
                'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
              )}
            >
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
                  <span className="text-gray-500">{req.date}</span>
                </div>
              </div>
              <div className="flex space-x-2 mt-2 md:mt-0">
                {req.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
                    >
                      <XCircle className="h-4 w-4" /> Reject
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
