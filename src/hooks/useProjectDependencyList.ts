import { useEffect, useState } from 'react'
import { dependencyLoadMatches } from '@/features/flutter/dependencyLoad.ts'
import {
  listProjectDependencies,
  type DependencyErrorCode,
  type ProjectDependency,
} from '@/services/localDependencyService.ts'

interface LoadedDependencies {
  directory: string
  requestId: number
  packages: ProjectDependency[] | null
  errorCode: DependencyErrorCode | null
  failureOutput: string
}

export function useProjectDependencyList(directory: string | undefined): {
  packages: ProjectDependency[] | null
  loading: boolean
  errorCode: DependencyErrorCode | null
  failureOutput: string
  reload: () => void
} {
  const [requestId, setRequestId] = useState(0)
  const [loaded, setLoaded] = useState<LoadedDependencies | null>(null)
  const current = dependencyLoadMatches(loaded, directory, requestId)
    ? loaded
    : null

  useEffect(() => {
    if (!directory) {
      return
    }

    const requestDirectory = directory
    let active = true

    listProjectDependencies(requestDirectory)
      .then((result) => {
        if (!active) {
          return
        }
        if (!result.ok) {
          setLoaded({
            directory: requestDirectory,
            requestId,
            packages: null,
            errorCode: result.code,
            failureOutput: result.output,
          })
          return
        }
        setLoaded({
          directory: requestDirectory,
          requestId,
          packages: result.packages,
          errorCode: null,
          failureOutput: '',
        })
      })
      .catch(() => {
        if (!active) {
          return
        }
        setLoaded({
          directory: requestDirectory,
          requestId,
          packages: null,
          errorCode: 'offline',
          failureOutput: '',
        })
      })

    return () => {
      active = false
    }
  }, [directory, requestId])

  return {
    packages: current?.packages ?? null,
    loading: directory !== undefined && current === null,
    errorCode: current?.errorCode ?? null,
    failureOutput: current?.failureOutput ?? '',
    reload: () => {
      setRequestId((currentId) => currentId + 1)
    },
  }
}
