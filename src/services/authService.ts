import { FirebaseError } from 'firebase/app'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { isAuthorizedEmail } from '@/lib/authorizedUser.ts'
import { getFirebaseServices } from '@/lib/firebase.ts'

export interface AuthUser {
  uid: string
  email: string | null
  isAuthorized: boolean
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
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
    throw toAuthError(error, 'Could not sign in.')
  }
}

export async function signOutCurrentUser(): Promise<void> {
  try {
    const { auth } = getFirebaseServices()
    await signOut(auth)
  } catch (error: unknown) {
    throw toAuthError(error, 'Could not sign out.')
  }
}

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    isAuthorized: isAuthorizedEmail(user.email),
  }
}

function toAuthError(error: unknown, fallback: string): AuthError {
  if (error instanceof AuthError) {
    return error
  }

  if (error instanceof FirebaseError) {
    console.error(`Authentication failed: ${error.code}`)

    if (error.code === 'auth/invalid-email') {
      return new AuthError('Enter a valid email address.')
    }

    if (
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password'
    ) {
      return new AuthError('Email or password is incorrect.')
    }

    if (error.code === 'auth/too-many-requests') {
      return new AuthError('Too many attempts. Wait a moment and try again.')
    }

    if (error.code === 'auth/network-request-failed') {
      return new AuthError('Could not reach Firebase.')
    }

    if (error.code === 'auth/user-disabled') {
      return new AuthError('This account is disabled.')
    }
  } else if (
    error instanceof Error &&
    error.message.startsWith('Missing Firebase configuration')
  ) {
    return new AuthError('Firebase configuration is missing.')
  } else {
    console.error('Authentication failed.')
  }

  return new AuthError(fallback)
}
