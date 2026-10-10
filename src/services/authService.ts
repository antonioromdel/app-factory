import { FirebaseError } from 'firebase/app'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { getFirebaseServices } from '@/lib/firebase.ts'

export interface AuthUser {
  uid: string
  email: string | null
}

export const authErrorCodes = [
  'invalid-email',
  'invalid-credential',
  'too-many-requests',
  'network',
  'disabled',
  'missing-config',
  'sign-in',
  'sign-out',
] as const

export type AuthErrorCode = (typeof authErrorCodes)[number]

export class AuthError extends Error {
  readonly code: AuthErrorCode

  constructor(code: AuthErrorCode) {
    super(code)
    this.name = 'AuthError'
    this.code = code
  }
}

export function subscribeToAuthState(
  listener: (user: AuthUser | null) => void,
): () => void {
  const { auth } = getFirebaseServices()

  return onAuthStateChanged(auth, (user) => {
    listener(user ? toAuthUser(user) : null)
  })
}

export async function signIn(email: string, password: string): Promise<void> {
  try {
    const { auth } = getFirebaseServices()
    await signInWithEmailAndPassword(auth, email.trim(), password)
  } catch (error: unknown) {
    throw toAuthError(error, 'sign-in')
  }
}

export async function signOutCurrentUser(): Promise<void> {
  try {
    const { auth } = getFirebaseServices()
    await signOut(auth)
  } catch (error: unknown) {
    throw toAuthError(error, 'sign-out')
  }
}

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
  }
}

function toAuthError(error: unknown, fallback: AuthErrorCode): AuthError {
  if (error instanceof AuthError) {
    return error
  }

  if (error instanceof FirebaseError) {
    console.error(`Authentication failed: ${error.code}`)

    if (error.code === 'auth/invalid-email') {
      return new AuthError('invalid-email')
    }

    if (
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password'
    ) {
      return new AuthError('invalid-credential')
    }

    if (error.code === 'auth/too-many-requests') {
      return new AuthError('too-many-requests')
    }

    if (error.code === 'auth/network-request-failed') {
      return new AuthError('network')
    }

    if (error.code === 'auth/user-disabled') {
      return new AuthError('disabled')
    }
  } else if (
    error instanceof Error &&
    error.message.startsWith('Missing Firebase configuration')
  ) {
    return new AuthError('missing-config')
  } else {
    console.error('Authentication failed.')
  }

  return new AuthError(fallback)
}
