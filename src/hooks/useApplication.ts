import { useEffect, useState } from 'react'
import {
  ApplicationDataError,
  getApplication,
} from '@/services/applicationService.ts'
import type { Application } from '@/types/application.ts'

interface ApplicationState {
  loadedId: string | undefined
  status: 'ready' | 'missing' | 'error'
  application: Application | null
  errorMessage: string | null
}

export function useApplication(id: string | undefined): {
  status: 'loading' | 'ready' | 'missing' | 'error'
  application: Application | null
  errorMessage: string | null
  reload: () => void
} {
  const [requestId, setRequestId] = useState(0)
  const [state, setState] = useState<ApplicationState>({
    loadedId: undefined,
    status: 'missing',
    application: null,
    errorMessage: null,
  })

  useEffect(() => {
    if (!id) {
      return
    }

    let active = true

    getApplication(id)
      .then((application) => {
        if (!active) {
          return
        }

        if (!application) {
          setState({
            loadedId: id,
            status: 'missing',
            application: null,
            errorMessage: null,
          })
          return
        }

        setState({
          loadedId: id,
          status: 'ready',
          application,
          errorMessage: null,
        })
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setState({
          loadedId: id,
          status: 'error',
          application: null,
          errorMessage:
            error instanceof ApplicationDataError
              ? error.message
              : 'Could not load the application.',
        })
      })

    return () => {
      active = false
    }
  }, [id, requestId])

  const reload = (): void => {
    setState((current) => ({ ...current, loadedId: undefined }))
    setRequestId((current) => current + 1)
  }

  if (!id) {
    return {
      status: 'missing',
      application: null,
      errorMessage: null,
      reload,
    }
  }

  if (state.loadedId !== id) {
    return {
      status: 'loading',
      application: null,
      errorMessage: null,
      reload,
    }
  }

  return {
    status: state.status,
    application: state.application,
    errorMessage: state.errorMessage,
    reload,
  }
}
