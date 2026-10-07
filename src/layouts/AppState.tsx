import type { ReactElement } from 'react'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { AuthStatus } from './AuthLayout.tsx'

export function GlobalLoading(): ReactElement {
  const { messages } = useLanguage()
  return <AuthStatus message={messages.auth.checkingSession} tone="status" />
}

export function GlobalError({ message }: { message: string }): ReactElement {
  return <AuthStatus message={message} tone="alert" />
}
