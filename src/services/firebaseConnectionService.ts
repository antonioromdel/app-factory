import { FirebaseError } from 'firebase/app'
import { doc, getDocFromServer } from 'firebase/firestore'
import { getFirebaseServices } from '@/lib/firebase.ts'

export interface FirebaseConnectionResult {
  projectId: string
}

export class FirebaseConnectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FirebaseConnectionError'
  }
}

export async function verifyFirebaseConnection(): Promise<FirebaseConnectionResult> {
  try {
    const { app, auth, db } = getFirebaseServices()
    const projectId = app.options.projectId

    if (!projectId) {
      throw new FirebaseConnectionError('Firebase configuration is missing.')
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
      return new FirebaseConnectionError('Could not reach Firebase.')
    }

    if (error.code === 'failed-precondition') {
      return new FirebaseConnectionError(
        'Firestore is not set up for this project yet.',
      )
    }

    if (
      error.code.startsWith('auth/invalid-api-key') ||
      error.code.includes('api-key')
    ) {
      return new FirebaseConnectionError(
        'Firebase rejected the project configuration.',
      )
    }
  } else if (
    error instanceof Error &&
    error.message.startsWith('Missing Firebase configuration')
  ) {
    return new FirebaseConnectionError('Firebase configuration is missing.')
  } else {
    console.error('Firebase connection failed.')
  }

  return new FirebaseConnectionError('Could not connect to Firebase.')
}
