import type { ReactElement, ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth.ts'
import { LoginPage } from '@/pages/LoginPage.tsx'

export function RequireAuth({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export function LoginRoute(): ReactElement {
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/" replace />
  }

  return <LoginPage />
}
