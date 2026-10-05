import type { ReactElement, ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth.ts'
import { AccessDeniedPage } from '@/pages/AccessDeniedPage.tsx'
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

  if (!user.isAuthorized) {
    return <Navigate to="/access-denied" replace />
  }

  return <>{children}</>
}

export function LoginRoute(): ReactElement {
  const { user } = useAuth()

  if (user?.isAuthorized) {
    return <Navigate to="/" replace />
  }

  if (user) {
    return <Navigate to="/access-denied" replace />
  }

  return <LoginPage />
}

export function AccessDeniedRoute(): ReactElement {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.isAuthorized) {
    return <Navigate to="/" replace />
  }

  return <AccessDeniedPage />
}
