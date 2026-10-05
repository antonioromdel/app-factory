import type { ReactElement } from 'react'
import { AuthStatus } from './AuthLayout.tsx'

export function GlobalLoading(): ReactElement {
  return <AuthStatus message="Checking session…" tone="status" />
}

export function GlobalError({ message }: { message: string }): ReactElement {
  return <AuthStatus message={message} tone="alert" />
}
