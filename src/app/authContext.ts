import { createContext } from 'react'
import type { AuthUser } from '@/services/authService.ts'

export type AuthStartupCode = 'missing-config' | 'start-failed'

export interface AuthContextValue {
  status: 'loading' | 'ready' | 'error'
  user: AuthUser | null
  configError: AuthStartupCode | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
