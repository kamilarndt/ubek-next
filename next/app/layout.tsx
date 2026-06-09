'use client'

import { AuthProvider } from '@/lib/auth-context'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = pathname.startsWith('/auth')

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={cn('antialiased', isPublic ? '' : 'bg-gray-50')}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
