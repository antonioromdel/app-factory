import { useEffect, useState } from 'react'
import {
  FirebaseConnectionError,
  verifyFirebaseConnection,
} from '@/services/firebaseConnectionService.ts'

export type FirebaseConnectionState =
  | { status: 'loading' }
  | { status: 'connected'; projectId: string }
  | { status: 'error'; message: string }

export function useFirebaseConnection(): FirebaseConnectionState {
  const [state, setState] = useState<FirebaseConnectionState>({
    status: 'loading',
  })

  useEffect(() => {
    let active = true

    verifyFirebaseConnection()
      .then((result) => {
        if (active) {
          setState({ status: 'connected', projectId: result.projectId })
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        const message =
          error instanceof FirebaseConnectionError
            ? error.message
            : 'Could not connect to Firebase.'

        setState({ status: 'error', message })
      })

    return () => {
      active = false
    }
  }, [])

  return state
}
