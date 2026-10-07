import { useEffect, useState } from 'react'
import {
  connectionErrorCode,
  verifyFirebaseConnection,
  type ConnectionErrorCode,
} from '@/services/firebaseConnectionService.ts'

export type FirebaseConnectionState =
  | { status: 'loading' }
  | { status: 'connected'; projectId: string }
  | { status: 'error'; code: ConnectionErrorCode }

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

        setState({ status: 'error', code: connectionErrorCode(error) })
      })

    return () => {
      active = false
    }
  }, [])

  return state
}
