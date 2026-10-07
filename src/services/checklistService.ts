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
  isChecklistItemId,
  orderedCompletedIds,
  type ChecklistItemId,
} from '@/types/checklist.ts'

const progressDocumentId = 'progress'

export const checklistErrorCodes = [
  'load',
  'save',
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

export async function getChecklistProgress(
  applicationId: string,
): Promise<ChecklistItemId[]> {
  try {
    const { db } = getFirebaseServices()
    const snapshot = await getDoc(progressRef(db, applicationId))
    if (!snapshot.exists()) {
      return []
    }

    return readCompletedIds(snapshot.data())
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
    await setDoc(progressRef(db, applicationId), {
      completedItemIds: orderedCompletedIds(completedItemIds),
      updatedAt: serverTimestamp(),
    })
  } catch (error: unknown) {
    throw toChecklistError(error, 'save')
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

function readCompletedIds(data: unknown): ChecklistItemId[] {
  if (!isRecord(data) || !Array.isArray(data.completedItemIds)) {
    return []
  }

  const ids = data.completedItemIds.filter(
    (value): value is string => typeof value === 'string',
  )
  return orderedCompletedIds(ids.filter(isChecklistItemId))
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
