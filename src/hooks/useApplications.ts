import { useEffect, useState } from 'react'
import {
  applicationErrorCode,
  listApplications,
  type ApplicationErrorCode,
} from '@/services/applicationService.ts'
import type { Application } from '@/types/application.ts'

interface ApplicationsState {
  status: 'loading' | 'ready' | 'error'
  applications: Application[]
  errorCode: ApplicationErrorCode | null
}

export function useApplications(): ApplicationsState & { reload: () => void } {
  const [requestId, setRequestId] = useState(0)
  const [state, setState] = useState<ApplicationsState>({
    status: 'loading',
    applications: [],
    errorCode: null,
  })

  useEffect(() => {
    let active = true

    listApplications()
      .then((applications) => {
        if (active) {
          setState({ status: 'ready', applications, errorCode: null })
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setState({
          status: 'error',
          applications: [],
          errorCode: applicationErrorCode(error, 'load-list'),
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
