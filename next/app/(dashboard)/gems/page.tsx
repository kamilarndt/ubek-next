'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Gem,
  Code,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  gem: Gem,
  code: Code,
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  green: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
}

interface Project {
  id: string
  userId: string
  name: string
  instructions: string
  icon: string
  createdAt: Date
  updatedAt: Date
}

const colors = ['blue', 'green', 'purple', 'orange']
const DEFAULT_ICON = 'gem'

/** Map DB project to UI gem card */
function projectToGem(project: Project) {
  return {
    id: project.id,
    name: project.name,
    icon: iconMap[project.icon] ? project.icon : DEFAULT_ICON,
    description: project.instructions || 'No description',
    color: colors[Math.abs(project.id.charCodeAt(0)) % colors.length],
  }
}

export default function GemsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [gems, setGems] = useState<ReturnType<typeof projectToGem>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/projects', { credentials: 'include' })
      if (!res.ok) {
        throw new Error('Failed to load projects')
      }
      const data = (await res.json()) as Project[]
      setProjects(data)
      setGems(data.map(projectToGem))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      setCreating(true)
      setError(null)
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newName.trim(),
          instructions: newDescription.trim(),
        }),
      })
      if (!res.ok) {
        throw new Error('Failed to create project')
      }
      const created = (await res.json()) as Project
      setProjects((prev) => [...prev, created])
      setGems((prev) => [...prev, projectToGem(created)])
      setNewName('')
      setNewDescription('')
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      setDeletingId(id)
      setError(null)
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error('Failed to delete project')
      }
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setGems((prev) => prev.filter((g) => g.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  function startEditing(gem: ReturnType<typeof projectToGem>) {
    const project = projects.find((p) => p.id === gem.id)
    if (!project) return
    setEditingId(gem.id)
    setEditName(project.name)
    setEditDescription(project.instructions)
  }

  async function handleEditSave(id: string) {
    if (!editName.trim()) return
    try {
      setSavingId(id)
      setError(null)
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editName.trim(),
          instructions: editDescription.trim(),
        }),
      })
      if (!res.ok) {
        throw new Error('Failed to update project')
      }
      const updated = (await res.json()) as Project
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? updated : p))
      )
      setGems((prev) =>
        prev.map((g) => (g.id === id ? projectToGem(updated) : g))
      )
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingId(null)
    }
  }

  function handleEditCancel() {
    setEditingId(null)
    setEditName('')
    setEditDescription('')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Gems
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {user ? `Welcome, ${user.name}` : 'Manage your AI agent projects'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Gem
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div className="mx-8 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300 flex-1">
            {error}
          </span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New gem inline form */}
      {showForm && (
        <div className="mx-8 mt-6 p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Create New Gem
            </h2>
            <button
              onClick={() => {
                setShowForm(false)
                setNewName('')
                setNewDescription('')
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="gem-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Name
              </label>
              <input
                id="gem-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Research"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="gem-description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="gem-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What is this gem for?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => {
                  setShowForm(false)
                  setNewName('')
                  setNewDescription('')
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Gem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gem cards grid */}
      <div className="px-8 py-6">
        {gems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Gem className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No gems yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
              Create your first gem to start managing AI agent projects.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create your first gem
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gems.map((gem) => {
              const Icon = iconMap[gem.icon] || Gem
              const colorClass = colorMap[gem.color] || colorMap.blue
              const isEditing = editingId === gem.id
              const isSaving = savingId === gem.id
              const isDeleting = deletingId === gem.id

              return (
                <div
                  key={gem.id}
                  className={cn(
                    'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md transition-shadow',
                    isDeleting && 'opacity-50 pointer-events-none'
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={handleEditCancel}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleEditSave(gem.id)}
                          disabled={!editName.trim() || isSaving}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={cn(
                            'w-12 h-12 rounded-full flex items-center justify-center',
                            colorClass
                          )}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditing(gem)}
                            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label={`Edit ${gem.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(gem.id)}
                            disabled={isDeleting}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                            aria-label={`Delete ${gem.name}`}
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Link
                        href={`/chat?project=${gem.id}`}
                        className="block group"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {gem.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {gem.description}
                        </p>
                      </Link>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
