import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '@/app/authContext.ts'

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return value
}
