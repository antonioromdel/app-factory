import { FirebaseError } from 'firebase/app'
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore'
import { getFirebaseServices } from '@/lib/firebase.ts'
import {
  knowledgeCategories,
  type KnowledgeArticle,
  type KnowledgeArticleInput,
  type KnowledgeCategory,
} from '@/types/knowledge.ts'

export const knowledgeCollection = 'knowledge'

export const knowledgeErrorCodes = [
  'incomplete',
  'title-required',
  'category-required',
  'load-list',
  'load-one',
  'create',
  'save',
  'delete',
  'permission',
  'unreachable',
] as const

export type KnowledgeErrorCode = (typeof knowledgeErrorCodes)[number]

export class KnowledgeDataError extends Error {
  readonly code: KnowledgeErrorCode

  constructor(code: KnowledgeErrorCode) {
    super(code)
    this.name = 'KnowledgeDataError'
    this.code = code
  }
}

export function knowledgeErrorCode(
  error: unknown,
  fallback: KnowledgeErrorCode,
): KnowledgeErrorCode {
  if (error instanceof KnowledgeDataError) {
    return error.code
  }

  return fallback
}

export async function listKnowledgeArticles(): Promise<KnowledgeArticle[]> {
  try {
    const { db } = getFirebaseServices()
    const snapshot = await getDocs(collection(db, knowledgeCollection))
    return snapshot.docs.map((item) =>
      articleFromFirestore(item.id, item.data()),
    )
  } catch (error: unknown) {
    throw toKnowledgeError(error, 'load-list')
  }
}

export async function getKnowledgeArticle(
  id: string,
): Promise<KnowledgeArticle | null> {
  try {
    const { db } = getFirebaseServices()
    const snapshot = await getDoc(doc(db, knowledgeCollection, id))
    if (!snapshot.exists()) {
      return null
    }

    return articleFromFirestore(snapshot.id, snapshot.data())
  } catch (error: unknown) {
    throw toKnowledgeError(error, 'load-one')
  }
}

export async function createKnowledgeArticle(
  input: KnowledgeArticleInput,
): Promise<string> {
  try {
    const { db } = getFirebaseServices()
    const created = await addDoc(
      collection(db, knowledgeCollection),
      newArticleDocument(input),
    )
    return created.id
  } catch (error: unknown) {
    throw toKnowledgeError(error, 'create')
  }
}

export async function updateKnowledgeArticle(
  id: string,
  input: KnowledgeArticleInput,
): Promise<void> {
  try {
    const { db } = getFirebaseServices()
    await updateDoc(doc(db, knowledgeCollection, id), articleUpdate(input))
  } catch (error: unknown) {
    throw toKnowledgeError(error, 'save')
  }
}

export async function deleteKnowledgeArticle(id: string): Promise<void> {
  try {
    const { db } = getFirebaseServices()
    await deleteDoc(doc(db, knowledgeCollection, id))
  } catch (error: unknown) {
    throw toKnowledgeError(error, 'delete')
  }
}

export async function setKnowledgeFavorite(
  id: string,
  favorite: boolean,
): Promise<void> {
  try {
    const { db } = getFirebaseServices()
    await updateDoc(doc(db, knowledgeCollection, id), { favorite })
  } catch (error: unknown) {
    throw toKnowledgeError(error, 'save')
  }
}

export async function markKnowledgeViewed(id: string): Promise<void> {
  try {
    const { db } = getFirebaseServices()
    await updateDoc(doc(db, knowledgeCollection, id), {
      viewedAt: serverTimestamp(),
    })
  } catch (error: unknown) {
    throw toKnowledgeError(error, 'save')
  }
}

export function articleFromFirestore(
  id: string,
  data: unknown,
): KnowledgeArticle {
  if (!isRecord(data)) {
    throw new KnowledgeDataError('incomplete')
  }

  const title = readString(data.title)
  const category = readCategory(data.category)
  if (!title || !category) {
    throw new KnowledgeDataError('incomplete')
  }

  const article: KnowledgeArticle = {
    id,
    title,
    category,
    tags: readTags(data.tags),
    content: readString(data.content) ?? '',
    favorite: data.favorite === true,
    createdAt: readTimestamp(data.createdAt),
    updatedAt: readTimestamp(data.updatedAt),
  }
  const viewedAt = readOptionalTimestamp(data.viewedAt)
  if (viewedAt) {
    article.viewedAt = viewedAt
  }

  return article
}

function newArticleDocument(input: KnowledgeArticleInput): DocumentData {
  const title = readString(input.title)
  if (!title) {
    throw new KnowledgeDataError('title-required')
  }
  if (!isKnowledgeCategory(input.category)) {
    throw new KnowledgeDataError('category-required')
  }

  const document: DocumentData = {
    title,
    category: input.category,
    favorite: input.favorite,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const tags = normalizeTags(input.tags)
  if (tags.length > 0) {
    document.tags = tags
  }
  const content = readString(input.content)
  if (content) {
    document.content = content
  }

  return document
}

function articleUpdate(input: KnowledgeArticleInput): DocumentData {
  const title = readString(input.title)
  if (!title) {
    throw new KnowledgeDataError('title-required')
  }
  if (!isKnowledgeCategory(input.category)) {
    throw new KnowledgeDataError('category-required')
  }

  const tags = normalizeTags(input.tags)
  const content = readString(input.content)

  return {
    title,
    category: input.category,
    favorite: input.favorite,
    updatedAt: serverTimestamp(),
    tags: tags.length > 0 ? tags : deleteField(),
    content: content ?? deleteField(),
  }
}

function toKnowledgeError(
  error: unknown,
  fallback: KnowledgeErrorCode,
): KnowledgeDataError {
  if (error instanceof KnowledgeDataError) {
    return error
  }

  if (error instanceof FirebaseError) {
    console.error(`Knowledge request failed: ${error.code}`)

    if (error.code === 'permission-denied') {
      return new KnowledgeDataError('permission')
    }

    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      return new KnowledgeDataError('unreachable')
    }
  } else {
    console.error('Knowledge request failed.')
  }

  return new KnowledgeDataError(fallback)
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

function readTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return normalizeTags(
    value.filter((item): item is string => typeof item === 'string'),
  )
}

function normalizeTags(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const tags: string[] = []

  for (const value of values) {
    const tag = value.trim()
    const key = tag.toLocaleLowerCase()
    if (!tag || seen.has(key)) {
      continue
    }

    seen.add(key)
    tags.push(tag)
  }

  return tags
}

function readCategory(value: unknown): KnowledgeCategory | undefined {
  return isKnowledgeCategory(value) ? value : undefined
}

function isKnowledgeCategory(value: unknown): value is KnowledgeCategory {
  return (
    typeof value === 'string' &&
    knowledgeCategories.some((category) => category === value)
  )
}

function readTimestamp(value: unknown): Timestamp {
  if (value instanceof Timestamp) {
    return value
  }

  throw new KnowledgeDataError('incomplete')
}

function readOptionalTimestamp(value: unknown): Timestamp | undefined {
  return value instanceof Timestamp ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
