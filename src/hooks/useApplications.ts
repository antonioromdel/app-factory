import { useEffect, useState } from 'react'
import {
  ApplicationDataError,
  listApplications,
} from '@/services/applicationService.ts'
import type { Application } from '@/types/application.ts'

interface ApplicationsState {
  status: 'loading' | 'ready' | 'error'
  applications: Application[]
  errorMessage: string | null
}

export function useApplications(): ApplicationsState & { reload: () => void } {
  const [requestId, setRequestId] = useState(0)
  const [state, setState] = useState<ApplicationsState>({
    status: 'loading',
    applications: [],
    errorMessage: null,
  })

  useEffect(() => {
    let active = true

    listApplications()
      .then((applications) => {
        if (active) {
          setState({ status: 'ready', applications, errorMessage: null })
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setState({
          status: 'error',
          applications: [],
          errorMessage:
            error instanceof ApplicationDataError
              ? error.message
              : 'Could not load applications.',
        })
      })

    return () => {
      active = false
    }
  }, [requestId])

  return {
    ...state,
    reload: () => {
      setRequestId((current) => current + 1)
    },
  }
}
