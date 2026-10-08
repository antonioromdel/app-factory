import { FirebaseError } from 'firebase/app'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore'
import { getFirebaseServices } from '@/lib/firebase.ts'
import { applicationsCollection } from '@/services/applicationService.ts'
import {
  checklistItems,
  isChecklistItemId,
  orderedCompletedIds,
  type ChecklistItemId,
} from '@/types/checklist.ts'
import {
  isChecklistTemplateId,
  templateItemIds,
  type ChecklistTemplateId,
} from '@/types/checklistTemplates.ts'

const progressDocumentId = 'progress'

export const checklistErrorCodes = [
  'load',
  'save',
  'copy',
  'permission',
  'unreachable',
] as const

export type ChecklistErrorCode = (typeof checklistErrorCodes)[number]

export class ChecklistDataError extends Error {
  readonly code: ChecklistErrorCode

  constructor(code: ChecklistErrorCode) {
    super(code)
    this.name = 'ChecklistDataError'
    this.code = code
  }
}

export function checklistErrorCode(
  error: unknown,
  fallback: ChecklistErrorCode,
): ChecklistErrorCode {
  if (error instanceof ChecklistDataError) {
    return error.code
  }

  return fallback
}

export interface ProjectChecklist {
  itemIds: ChecklistItemId[] | null
  completedItemIds: ChecklistItemId[]
  templateId: ChecklistTemplateId | null
}

export async function getProjectChecklist(
  applicationId: string,
): Promise<ProjectChecklist> {
  try {
    const { db } = getFirebaseServices()
    const snapshot = await getDoc(progressRef(db, applicationId))
    if (!snapshot.exists()) {
      return { itemIds: null, completedItemIds: [], templateId: null }
    }

    return readProjectChecklist(snapshot.data())
  } catch (error: unknown) {
    throw toChecklistError(error, 'load')
  }
}

export async function saveChecklistProgress(
  applicationId: string,
  completedItemIds: readonly ChecklistItemId[],
): Promise<void> {
  try {
    const { db } = getFirebaseServices()
    await setDoc(
      progressRef(db, applicationId),
      {
        completedItemIds: orderedCompletedIds(completedItemIds),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  } catch (error: unknown) {
    throw toChecklistError(error, 'save')
  }
}

export async function assignChecklistTemplate(
  applicationId: string,
  templateId: ChecklistTemplateId,
): Promise<void> {
  try {
    const { db } = getFirebaseServices()
    await setDoc(progressRef(db, applicationId), {
      itemIds: templateItemIds(templateId),
      completedItemIds: [],
      templateId,
      updatedAt: serverTimestamp(),
    })
  } catch (error: unknown) {
    throw toChecklistError(error, 'copy')
  }
}

export async function copyProjectChecklist(
  sourceId: string,
  targetId: string,
): Promise<void> {
  const source = await getProjectChecklist(sourceId)

  try {
    const { db } = getFirebaseServices()
    await setDoc(progressRef(db, targetId), {
      itemIds: source.itemIds ?? checklistItems.map((item) => item.id),
      completedItemIds: [],
      ...(source.templateId ? { templateId: source.templateId } : {}),
      updatedAt: serverTimestamp(),
    })
  } catch (error: unknown) {
    throw toChecklistError(error, 'copy')
  }
}

function progressRef(db: Firestore, applicationId: string): DocumentReference {
  return doc(
    db,
    applicationsCollection,
    applicationId,
    'checklist',
    progressDocumentId,
  )
}

function readProjectChecklist(data: unknown): ProjectChecklist {
  const itemIds = readItemIds(data)
  const allowed = new Set(itemIds ?? checklistItems.map((item) => item.id))

  return {
    itemIds,
    completedItemIds: readCompletedIds(data).filter((id) => allowed.has(id)),
    templateId: readTemplateId(data),
  }
}

function readItemIds(data: unknown): ChecklistItemId[] | null {
  if (!isRecord(data) || !Array.isArray(data.itemIds)) {
    return null
  }

  const ids = data.itemIds.filter(
    (value): value is string => typeof value === 'string',
  )
  return orderedCompletedIds(ids.filter(isChecklistItemId))
}

function readCompletedIds(data: unknown): ChecklistItemId[] {
  if (!isRecord(data) || !Array.isArray(data.completedItemIds)) {
    return []
  }

  const ids = data.completedItemIds.filter(
    (value): value is string => typeof value === 'string',
  )
  return orderedCompletedIds(ids.filter(isChecklistItemId))
}

function readTemplateId(data: unknown): ChecklistTemplateId | null {
  if (!isRecord(data) || typeof data.templateId !== 'string') {
    return null
  }

  return isChecklistTemplateId(data.templateId) ? data.templateId : null
}

function toChecklistError(
  error: unknown,
  fallback: ChecklistErrorCode,
): ChecklistDataError {
  if (error instanceof ChecklistDataError) {
    return error
  }

  if (error instanceof FirebaseError) {
    console.error(`Checklist request failed: ${error.code}`)

    if (error.code === 'permission-denied') {
      return new ChecklistDataError('permission')
    }

    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      return new ChecklistDataError('unreachable')
    }
  } else {
    console.error('Checklist request failed.')
  }

  return new ChecklistDataError(fallback)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
