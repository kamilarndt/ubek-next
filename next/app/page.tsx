'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function HomePage() {
  const { isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      router.replace('/dashboard')
    }
  }, [isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-3xl font-semibold text-zinc-900">UBEK Next</div>
          <div className="text-sm text-zinc-500">Loading...</div>
        </div>
      </div>
    )
  }

  return null
}
