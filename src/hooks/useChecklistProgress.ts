import { useEffect, useState } from 'react'
import { toggleChecklistItem } from '@/features/checklists/checklistProgress.ts'
import {
  checklistErrorCode,
  getChecklistProgress,
  saveChecklistProgress,
  type ChecklistErrorCode,
} from '@/services/checklistService.ts'
import type { ChecklistItemId } from '@/types/checklist.ts'

interface ChecklistState {
  loadedId: string | undefined
  status: 'ready' | 'error'
  completed: ChecklistItemId[]
  errorCode: ChecklistErrorCode | null
}

export function useChecklistProgress(applicationId: string): {
  status: 'loading' | 'ready' | 'error'
  completed: ChecklistItemId[]
  errorCode: ChecklistErrorCode | null
  isSaving: boolean
  reload: () => void
  toggle: (itemId: ChecklistItemId) => Promise<void>
} {
  const [requestId, setRequestId] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [state, setState] = useState<ChecklistState>({
    loadedId: undefined,
    status: 'error',
    completed: [],
    errorCode: null,
  })

  useEffect(() => {
    let active = true

    getChecklistProgress(applicationId)
      .then((completed) => {
        if (!active) {
          return
        }

        setState({
          loadedId: applicationId,
          status: 'ready',
          completed,
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
          completed: [],
          errorCode: checklistErrorCode(error, 'load'),
        })
      })

    return () => {
      active = false
    }
  }, [applicationId, requestId])

  const reload = (): void => {
    setRequestId((current) => current + 1)
  }

  async function toggle(itemId: ChecklistItemId): Promise<void> {
    if (
      state.status !== 'ready' ||
      state.loadedId !== applicationId ||
      isSaving
    ) {
      return
    }

    const previous = state.completed
    const next = toggleChecklistItem(previous, itemId)
    setIsSaving(true)
    setState({
      loadedId: applicationId,
      status: 'ready',
      completed: next,
      errorCode: null,
    })

    try {
      await saveChecklistProgress(applicationId, next)
    } catch (error: unknown) {
      setState({
        loadedId: applicationId,
        status: 'ready',
        completed: previous,
        errorCode: checklistErrorCode(error, 'save'),
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (state.loadedId !== applicationId) {
    return {
      status: 'loading',
      completed: [],
      errorCode: null,
      isSaving: false,
      reload,
      toggle,
    }
  }

  return {
    status: state.status,
    completed: state.completed,
    errorCode: state.errorCode,
    isSaving,
    reload,
    toggle,
  }
}
