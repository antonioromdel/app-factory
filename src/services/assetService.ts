import { FirebaseError } from 'firebase/app'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore'
import {
  deleteObject,
  getBlob,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage'
import { getFirebaseServices } from '@/lib/firebase.ts'
import {
  isAssetCategory,
  isAssetContentType,
  maxAssetBytes,
  type ApplicationAsset,
  type AssetCategory,
} from '@/types/asset.ts'

export const assetErrorCodes = [
  'incomplete',
  'load',
  'upload',
  'save',
  'delete',
  'download',
  'too-large',
  'unsupported-type',
  'permission',
  'unreachable',
] as const

export type AssetErrorCode = (typeof assetErrorCodes)[number]

export class AssetDataError extends Error {
  readonly code: AssetErrorCode

  constructor(code: AssetErrorCode) {
    super(code)
    this.name = 'AssetDataError'
    this.code = code
  }
}

export function assetErrorCode(
  error: unknown,
  fallback: AssetErrorCode,
): AssetErrorCode {
  if (error instanceof AssetDataError) {
    return error.code
  }

  return fallback
}

export async function listApplicationAssets(
  applicationId: string,
): Promise<ApplicationAsset[]> {
  try {
    const snapshot = await getDocs(assetsCollection(applicationId))
    return snapshot.docs.map((item) => assetFromFirestore(item.id, item.data()))
  } catch (error: unknown) {
    throw toAssetError(error, 'load')
  }
}

export async function uploadApplicationAsset(
  applicationId: string,
  file: File,
  category: AssetCategory,
  order: number,
): Promise<void> {
  if (file.size > maxAssetBytes) {
    throw new AssetDataError('too-large')
  }

  if (!isAssetContentType(file.type)) {
    throw new AssetDataError('unsupported-type')
  }

  const { storage } = getFirebaseServices()
  const assetRef = doc(assetsCollection(applicationId))
  const storagePath = `applications/${applicationId}/assets/${assetRef.id}/${safeFileName(file.name)}`
  const storageRef = ref(storage, storagePath)

  try {
    await uploadBytes(storageRef, file, { contentType: file.type })
    const url = await getDownloadURL(storageRef)

    try {
      await setDoc(assetRef, {
        name: displayName(file.name),
        category,
        contentType: file.type,
        size: file.size,
        storagePath,
        url,
        order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (error: unknown) {
      await deleteObject(storageRef).catch(() => undefined)
      throw error
    }
  } catch (error: unknown) {
    throw toAssetError(error, 'upload')
  }
}

export async function updateApplicationAsset(
  applicationId: string,
  assetId: string,
  input: { category: AssetCategory; order: number },
): Promise<void> {
  try {
    await updateDoc(doc(assetsCollection(applicationId), assetId), {
      category: input.category,
      order: input.order,
      updatedAt: serverTimestamp(),
    })
  } catch (error: unknown) {
    throw toAssetError(error, 'save')
  }
}

export async function deleteApplicationAsset(
  applicationId: string,
  assetId: string,
): Promise<void> {
  try {
    const { storage } = getFirebaseServices()
    const assetRef = doc(assetsCollection(applicationId), assetId)
    const snapshot = await getDoc(assetRef)
    const storagePath = snapshot.exists()
      ? readString(snapshot.data().storagePath)
      : undefined

    if (storagePath) {
      assertOwnedPath(applicationId, storagePath)
      try {
        await deleteObject(ref(storage, storagePath))
      } catch (error: unknown) {
        if (!isMissingStorageObject(error)) {
          throw error
        }
      }
    }

    await deleteDoc(assetRef)
  } catch (error: unknown) {
    throw toAssetError(error, 'delete')
  }
}

export async function downloadApplicationAsset(
  applicationId: string,
  asset: ApplicationAsset,
): Promise<void> {
  try {
    assertOwnedPath(applicationId, asset.storagePath)
    const { storage } = getFirebaseServices()
    const blob = await getBlob(ref(storage, asset.storagePath))
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = asset.name
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  } catch (error: unknown) {
    throw toAssetError(error, 'download')
  }
}

function assetsCollection(applicationId: string) {
  const { db } = getFirebaseServices()
  return collection(db, 'applications', applicationId, 'assets')
}

function assetFromFirestore(id: string, data: DocumentData): ApplicationAsset {
  const name = readString(data.name)
  const category = readString(data.category)
  const contentType = readString(data.contentType)
  const storagePath = readString(data.storagePath)
  const url = readString(data.url)
  const size = data.size
  const order = data.order

  if (
    !name ||
    !category ||
    !isAssetCategory(category) ||
    !contentType ||
    !storagePath ||
    !url ||
    typeof size !== 'number' ||
    typeof order !== 'number' ||
    !(data.createdAt instanceof Timestamp) ||
    !(data.updatedAt instanceof Timestamp)
  ) {
    throw new AssetDataError('incomplete')
  }

  return {
    id,
    name,
    category,
    contentType,
    size,
    storagePath,
    url,
    order,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function assertOwnedPath(applicationId: string, storagePath: string): void {
  const prefix = `applications/${applicationId}/assets/`
  if (!storagePath.startsWith(prefix) || storagePath.includes('..')) {
    throw new AssetDataError('incomplete')
  }
}

function safeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'asset'
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .slice(0, 120)

  return cleaned || 'asset'
}

function displayName(name: string): string {
  const trimmed = name.trim().slice(0, 180)
  return trimmed || 'asset'
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

function isMissingStorageObject(error: unknown): boolean {
  return (
    error instanceof FirebaseError && error.code === 'storage/object-not-found'
  )
}

function toAssetError(
  error: unknown,
  fallback: AssetErrorCode,
): AssetDataError {
  if (error instanceof AssetDataError) {
    return error
  }

  if (error instanceof FirebaseError) {
    console.error(`Asset request failed: ${error.code}`)

    if (
      error.code === 'permission-denied' ||
      error.code === 'storage/unauthorized' ||
      error.code === 'storage/unauthenticated'
    ) {
      return new AssetDataError('permission')
    }

    if (
      error.code === 'unavailable' ||
      error.code === 'deadline-exceeded' ||
      error.code === 'storage/retry-limit-exceeded'
    ) {
      return new AssetDataError('unreachable')
    }
  } else {
    console.error('Asset request failed.')
  }

  return new AssetDataError(fallback)
}
