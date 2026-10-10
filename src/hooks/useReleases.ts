import { useEffect, useState } from 'react'
import {
  listReleases,
  releaseErrorCode,
  type ReleaseErrorCode,
} from '@/services/releaseService.ts'
import type { Release } from '@/types/release.ts'

interface ReleasesState {
  status: 'loading' | 'ready' | 'error'
  releases: Release[]
  errorCode: ReleaseErrorCode | null
}

export function useReleases(): ReleasesState & { reload: () => void } {
  const [requestId, setRequestId] = useState(0)
  const [state, setState] = useState<ReleasesState>({
    status: 'loading',
    releases: [],
    errorCode: null,
  })

  useEffect(() => {
    let active = true

    listReleases()
      .then((releases) => {
        if (active) {
          setState({ status: 'ready', releases, errorCode: null })
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }
        setState({
          status: 'error',
          releases: [],
          errorCode: releaseErrorCode(error, 'load'),
        })
      })

    return () => {
      active = false
    }
  }, [requestId])

  return {
    ...state,
    reload: () => setRequestId((current) => current + 1),
  }
}
