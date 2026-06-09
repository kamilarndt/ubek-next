'use client'

import { ReactNode, Suspense } from 'react'
import { useAuth } from '@/lib/auth-context'
import AppSidebar from '@/components/layout/app-sidebar'
import Topbar from '@/components/layout/topbar'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      <Suspense fallback={
        <div className="w-64 h-screen border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-center text-sm text-gray-500">
          Loading sidebar...
        </div>
      }>
        <AppSidebar />
      </Suspense>
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
