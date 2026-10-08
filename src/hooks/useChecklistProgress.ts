import { useEffect, useState } from 'react'
import { toggleChecklistItem } from '@/features/checklists/checklistProgress.ts'
import {
  checklistErrorCode,
  getProjectChecklist,
  saveChecklistProgress,
  type ChecklistErrorCode,
} from '@/services/checklistService.ts'
import type { ChecklistItemId } from '@/types/checklist.ts'
import type { ChecklistTemplateId } from '@/types/checklistTemplates.ts'

interface ChecklistState {
  loadedId: string | undefined
  status: 'ready' | 'error'
  itemIds: ChecklistItemId[] | null
  completed: ChecklistItemId[]
  templateId: ChecklistTemplateId | null
  errorCode: ChecklistErrorCode | null
}

export function useChecklistProgress(applicationId: string): {
  status: 'loading' | 'ready' | 'error'
  itemIds: ChecklistItemId[] | null
  completed: ChecklistItemId[]
  templateId: ChecklistTemplateId | null
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
    itemIds: null,
    completed: [],
    templateId: null,
    errorCode: null,
  })

  useEffect(() => {
    let active = true

    getProjectChecklist(applicationId)
      .then((checklist) => {
        if (!active) {
          return
        }

        setState({
          loadedId: applicationId,
          status: 'ready',
          itemIds: checklist.itemIds,
          completed: checklist.completedItemIds,
          templateId: checklist.templateId,
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
          itemIds: null,
          completed: [],
          templateId: null,
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
      itemIds: state.itemIds,
      completed: next,
      templateId: state.templateId,
      errorCode: null,
    })

    try {
      await saveChecklistProgress(applicationId, next)
    } catch (error: unknown) {
      setState({
        loadedId: applicationId,
        status: 'ready',
        itemIds: state.itemIds,
        completed: previous,
        templateId: state.templateId,
        errorCode: checklistErrorCode(error, 'save'),
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (state.loadedId !== applicationId) {
    return {
      status: 'loading',
      itemIds: null,
      completed: [],
      templateId: null,
      errorCode: null,
      isSaving: false,
      reload,
      toggle,
    }
  }

  return {
    status: state.status,
    itemIds: state.itemIds,
    completed: state.completed,
    templateId: state.templateId,
    errorCode: state.errorCode,
    isSaving,
    reload,
    toggle,
  }
}
