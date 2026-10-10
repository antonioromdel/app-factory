import { FirebaseError } from 'firebase/app'
import {
  collection,
  collectionGroup,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import {
  applicationIdFromReleasePath,
  parseRelease,
  ReleaseRecordError,
  releaseInputFromFields,
  sortReleases,
} from '@/features/releases/releaseRecord.ts'
import { getFirebaseServices } from '@/lib/firebase.ts'
import type { Release, ReleaseInput } from '@/types/release.ts'

export const releaseErrorCodes = [
  'load',
  'save',
  'delete',
  'invalid',
  'incomplete',
  'permission',
  'unreachable',
] as const

export type ReleaseErrorCode = (typeof releaseErrorCodes)[number]

export class ReleaseDataError extends Error {
  readonly code: ReleaseErrorCode

  constructor(code: ReleaseErrorCode) {
    super(code)
    this.name = 'ReleaseDataError'
    this.code = code
  }
}

export function releaseErrorCode(
  error: unknown,
  fallback: ReleaseErrorCode,
): ReleaseErrorCode {
  if (error instanceof ReleaseDataError) {
    return error.code
  }
  return fallback
}

export async function listApplicationReleases(
  applicationId: string,
): Promise<Release[]> {
  try {
    const snapshot = await getDocs(releasesCollection(applicationId))
    return sortReleases(
      snapshot.docs.map((item) =>
        parseRelease(item.id, applicationId, item.data()),
      ),
    )
  } catch (error: unknown) {
    throw toReleaseError(error, 'load')
  }
}

export async function listReleases(): Promise<Release[]> {
  try {
    const { db } = getFirebaseServices()
    const snapshot = await getDocs(collectionGroup(db, 'releases'))
    const releases = snapshot.docs.flatMap((item) => {
      const applicationId = applicationIdFromReleasePath(item.ref.path)
      if (!applicationId) {
        return []
      }
      return [parseRelease(item.id, applicationId, item.data())]
    })
    return sortReleases(releases)
  } catch (error: unknown) {
    throw toReleaseError(error, 'load')
  }
}

export async function createRelease(
  applicationId: string,
  fields: {
    version: string
    buildNumber: string
    date: string
    platform: string
    status: string
    changes: string
    notes: string
  },
): Promise<void> {
  const draft = releaseInputFromFields(fields)
  if (!draft.ok) {
    throw new ReleaseDataError('invalid')
  }
  await writeRelease(applicationId, null, draft.input)
}

export async function updateRelease(
  applicationId: string,
  releaseId: string,
  fields: {
    version: string
    buildNumber: string
    date: string
    platform: string
    status: string
    changes: string
    notes: string
  },
): Promise<void> {
  const draft = releaseInputFromFields(fields)
  if (!draft.ok) {
    throw new ReleaseDataError('invalid')
  }
  await writeRelease(applicationId, releaseId, draft.input)
}

export async function deleteRelease(
  applicationId: string,
  releaseId: string,
): Promise<void> {
  try {
    await deleteDoc(doc(releasesCollection(applicationId), releaseId))
  } catch (error: unknown) {
    throw toReleaseError(error, 'delete')
  }
}

async function writeRelease(
  applicationId: string,
  releaseId: string | null,
  input: ReleaseInput,
): Promise<void> {
  try {
    if (!releaseId) {
      const releaseRef = doc(releasesCollection(applicationId))
      await setDoc(releaseRef, {
        version: input.version,
        buildNumber: input.buildNumber,
        date: input.date,
        platform: input.platform,
        status: input.status,
        ...optionalFields(input),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return
    }

    await updateDoc(doc(releasesCollection(applicationId), releaseId), {
      version: input.version,
      buildNumber: input.buildNumber,
      date: input.date,
      platform: input.platform,
      status: input.status,
      changes: input.changes ?? deleteField(),
      notes: input.notes ?? deleteField(),
      updatedAt: serverTimestamp(),
    })
  } catch (error: unknown) {
    throw toReleaseError(error, 'save')
  }
}

function optionalFields(input: ReleaseInput): {
  changes?: string
  notes?: string
} {
  const fields: { changes?: string; notes?: string } = {}
  if (input.changes) {
    fields.changes = input.changes
  }
  if (input.notes) {
    fields.notes = input.notes
  }
  return fields
}

function releasesCollection(applicationId: string) {
  const { db } = getFirebaseServices()
  return collection(db, 'applications', applicationId, 'releases')
}

function toReleaseError(
  error: unknown,
  fallback: ReleaseErrorCode,
): ReleaseDataError {
  if (error instanceof ReleaseDataError) {
    return error
  }
  if (error instanceof ReleaseRecordError) {
    return new ReleaseDataError('incomplete')
  }
  if (error instanceof FirebaseError) {
    console.error(`Release request failed: ${error.code}`)
    if (error.code === 'permission-denied') {
      return new ReleaseDataError('permission')
    }
    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      return new ReleaseDataError('unreachable')
    }
  } else {
    console.error('Release request failed.')
  }
  return new ReleaseDataError(fallback)
}
