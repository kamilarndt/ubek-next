'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { Plus, LogOut } from 'lucide-react'

const placeholderProjects = [
  { id: '1', name: 'General', icon: 'gem' },
  { id: '2', name: 'Development', icon: 'code' },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 h-screen border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-950">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">UBEK</h1>
          <button
            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600"
            aria-label="New Chat"
          >
            <Plus /> New Chat
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <ul className="space-y-1">
            {placeholderProjects.map((proj) => (
              <li key={proj.id}>
                <Link
                  href={`/dashboard/${proj.id}`}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800',
                    'text-gray-800 dark:text-gray-200'
                  )}
                >
                  {/* simple icon placeholder */}
                  <span className="inline-block w-5 h-5 bg-gray-400 rounded" />
                  {proj.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          {user && (
            <div className="flex items-center justify-between">
              <div className="flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {user.name}
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1 text-red-600 hover:text-red-700"
                aria-label="Logout"
              >
                <LogOut />
              </button>
            </div>
          )}
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
