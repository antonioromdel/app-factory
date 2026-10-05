import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { getFirebaseServices } from '@/lib/firebase.ts'
import {
  signIn as signInWithEmail,
  signOutCurrentUser,
  subscribeToAuthState,
  type AuthUser,
} from '@/services/authService.ts'
import { AuthContext, type AuthContextValue } from './authContext.ts'

interface AuthState {
  status: AuthContextValue['status']
  user: AuthUser | null
  configError: string | null
}

export function AuthProvider({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const [state, setState] = useState<AuthState>(() => {
    try {
      getFirebaseServices()
      return { status: 'loading', user: null, configError: null }
    } catch (error: unknown) {
      return {
        status: 'error',
        user: null,
        configError: startupErrorMessage(error),
      }
    }
  })

  useEffect(() => {
    if (state.status === 'error') {
      return
    }

    return subscribeToAuthState((user) => {
      setState({ status: 'ready', user, configError: null })
    })
  }, [state.status])

  async function signIn(email: string, password: string): Promise<void> {
    await signInWithEmail(email, password)
  }

  async function signOut(): Promise<void> {
    await signOutCurrentUser()
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

function startupErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.startsWith('Missing Firebase configuration')
  ) {
    return 'Firebase configuration is missing.'
  }

  return 'Could not start authentication.'
}
