import { useEffect, useState } from 'react'
import {
  listApplicationReleases,
  releaseErrorCode,
  type ReleaseErrorCode,
} from '@/services/releaseService.ts'
import type { Release } from '@/types/release.ts'

interface ReleaseState {
  loadedId: string | undefined
  status: 'ready' | 'error'
  releases: Release[]
  errorCode: ReleaseErrorCode | null
}

export function useApplicationReleases(applicationId: string): {
  status: 'loading' | 'ready' | 'error'
  releases: Release[]
  errorCode: ReleaseErrorCode | null
  reload: () => void
} {
  const [requestId, setRequestId] = useState(0)
  const [state, setState] = useState<ReleaseState>({
    loadedId: undefined,
    status: 'error',
    releases: [],
    errorCode: null,
  })

  useEffect(() => {
    let active = true

    listApplicationReleases(applicationId)
      .then((releases) => {
        if (!active) {
          return
        }
        setState({
          loadedId: applicationId,
          status: 'ready',
          releases,
          errorCode: null,
        })
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }
        setState({
          loadedId: applicationId,
          status: 'error',
          releases: [],
          errorCode: releaseErrorCode(error, 'load'),
        })
      })

    return () => {
      active = false
    }
  }, [applicationId, requestId])

  if (state.loadedId !== applicationId) {
    return {
      status: 'loading',
      releases: [],
      errorCode: null,
      reload: () => setRequestId((current) => current + 1),
    }
  }

  return {
    status: state.status,
    releases: state.releases,
    errorCode: state.errorCode,
    reload: () => setRequestId((current) => current + 1),
  }
}
