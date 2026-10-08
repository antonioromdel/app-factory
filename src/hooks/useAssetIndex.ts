import { useEffect, useState } from 'react'
import {
  assetErrorCode,
  listApplicationAssets,
  type AssetErrorCode,
} from '@/services/assetService.ts'
import type { ApplicationAsset } from '@/types/asset.ts'

export interface IndexedAsset {
  applicationId: string
  asset: ApplicationAsset
}

export function useAssetIndex(applicationIds: string[] | null): {
  status: 'loading' | 'ready' | 'error'
  assets: IndexedAsset[]
  errorCode: AssetErrorCode | null
  reload: () => void
} {
  const [requestId, setRequestId] = useState(0)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [status, setStatus] = useState<'ready' | 'error'>('ready')
  const [assets, setAssets] = useState<IndexedAsset[]>([])
  const [errorCode, setErrorCode] = useState<AssetErrorCode | null>(null)
  const idsKey = applicationIds === null ? null : applicationIds.join('\n')

  useEffect(() => {
    if (idsKey === null) {
      return
    }

    let active = true
    const ids = idsKey === '' ? [] : idsKey.split('\n')

    Promise.all(
      ids.map(async (applicationId) => {
        const listed = await listApplicationAssets(applicationId)
        return listed.map((asset) => ({ applicationId, asset }))
      }),
    )
      .then((groups) => {
        if (!active) {
          return
        }

        setAssets(groups.flat())
        setErrorCode(null)
        setStatus('ready')
        setLoadedKey(idsKey)
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setAssets([])
        setErrorCode(assetErrorCode(error, 'load'))
        setStatus('error')
        setLoadedKey(idsKey)
      })

    return () => {
      active = false
    }
  }, [idsKey, requestId])

  if (idsKey === null || loadedKey !== idsKey) {
    return {
      status: 'loading',
      assets: [],
      errorCode: null,
      reload: () => setRequestId((current) => current + 1),
    }
  }

  return {
    status,
    assets,
    errorCode,
    reload: () => setRequestId((current) => current + 1),
  }
}
