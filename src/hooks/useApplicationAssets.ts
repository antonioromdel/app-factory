import { useEffect, useState } from 'react'
import {
  assetErrorCode,
  listApplicationAssets,
  type AssetErrorCode,
} from '@/services/assetService.ts'
import type { ApplicationAsset } from '@/types/asset.ts'

interface AssetState {
  loadedId: string | undefined
  status: 'ready' | 'error'
  assets: ApplicationAsset[]
  errorCode: AssetErrorCode | null
}

export function useApplicationAssets(applicationId: string): {
  status: 'loading' | 'ready' | 'error'
  assets: ApplicationAsset[]
  errorCode: AssetErrorCode | null
  reload: () => void
} {
  const [requestId, setRequestId] = useState(0)
  const [state, setState] = useState<AssetState>({
    loadedId: undefined,
    status: 'error',
    assets: [],
    errorCode: null,
  })

  useEffect(() => {
    let active = true

    listApplicationAssets(applicationId)
      .then((assets) => {
        if (!active) {
          return
        }

        setState({
          loadedId: applicationId,
          status: 'ready',
          assets,
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
          assets: [],
          errorCode: assetErrorCode(error, 'load'),
        })
      })

    return () => {
      active = false
    }
  }, [applicationId, requestId])

  if (state.loadedId !== applicationId) {
    return {
      status: 'loading',
      assets: [],
      errorCode: null,
      reload: () => setRequestId((current) => current + 1),
    }
  }

  return {
    status: state.status,
    assets: state.assets,
    errorCode: state.errorCode,
    reload: () => setRequestId((current) => current + 1),
  }
}
