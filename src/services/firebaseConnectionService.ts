import { FirebaseError } from 'firebase/app'
import { doc, getDocFromServer } from 'firebase/firestore'
import { getFirebaseServices } from '@/lib/firebase.ts'

export interface FirebaseConnectionResult {
  projectId: string
}

export const connectionErrorCodes = [
  'missing-config',
  'unreachable',
  'not-setup',
  'rejected-config',
  'failed',
] as const

export type ConnectionErrorCode = (typeof connectionErrorCodes)[number]

export class FirebaseConnectionError extends Error {
  readonly code: ConnectionErrorCode

  constructor(code: ConnectionErrorCode) {
    super(code)
    this.name = 'FirebaseConnectionError'
    this.code = code
  }
}

export function connectionErrorCode(error: unknown): ConnectionErrorCode {
  if (error instanceof FirebaseConnectionError) {
    return error.code
  }

  return 'failed'
}

export async function verifyFirebaseConnection(): Promise<FirebaseConnectionResult> {
  try {
    const { app, auth, db } = getFirebaseServices()
    const projectId = app.options.projectId

    if (!projectId) {
      throw new FirebaseConnectionError('missing-config')
    }

    await auth.authStateReady()

    try {
      await getDocFromServer(doc(db, '_meta', 'connection'))
    } catch (error: unknown) {
      if (
        error instanceof FirebaseError &&
        error.code === 'permission-denied'
      ) {
        return { projectId }
      }

      throw error
    }

    return { projectId }
  } catch (error: unknown) {
    throw toConnectionError(error)
  }
}

function toConnectionError(error: unknown): FirebaseConnectionError {
  if (error instanceof FirebaseConnectionError) {
    return error
  }

  if (error instanceof FirebaseError) {
    console.error(`Firebase connection failed: ${error.code}`)

    if (
      error.code === 'unavailable' ||
      error.code === 'deadline-exceeded' ||
      error.code === 'auth/network-request-failed'
    ) {
      return new FirebaseConnectionError('unreachable')
    }

    if (error.code === 'failed-precondition') {
      return new FirebaseConnectionError('not-setup')
    }

    if (
      error.code.startsWith('auth/invalid-api-key') ||
      error.code.includes('api-key')
    ) {
      return new FirebaseConnectionError('rejected-config')
    }
  } else if (
    error instanceof Error &&
    error.message.startsWith('Missing Firebase configuration')
  ) {
    return new FirebaseConnectionError('missing-config')
  } else {
    console.error('Firebase connection failed.')
  }

  return new FirebaseConnectionError('failed')
}
