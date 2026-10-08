import type { Language } from '@/app/languageContext.ts'
import {
  knowledgeCategories,
  type KnowledgeCategory,
} from '@/types/knowledge.ts'
import libraryFile from './library.json'

interface LibraryArticleRecord {
  id: string
  category: KnowledgeCategory
  tags: string[]
  title: Record<Language, string>
  content: Record<Language, string>
}

export interface LibraryArticle {
  id: string
  title: string
  category: KnowledgeCategory
  tags: string[]
  content: string
}

const viewStorageKey = 'app-factory-library-views'

const records = readRecords()
const articleIds = new Set(records.map((article) => article.id))

export function isLibraryArticleId(id: string): boolean {
  return articleIds.has(id)
}

export function libraryArticles(language: Language): LibraryArticle[] {
  return records.map((record) => toArticle(record, language))
}

export function libraryArticle(
  id: string,
  language: Language,
): LibraryArticle | null {
  const record = records.find((article) => article.id === id)
  return record ? toArticle(record, language) : null
}

export function markLibraryViewed(id: string): void {
  if (!articleIds.has(id)) {
    return
  }

  const views = readViews()
  views[id] = new Date().toISOString()
  localStorage.setItem(viewStorageKey, JSON.stringify(views))
}

export function libraryViewedAt(id: string): Date | null {
  const value = readViews()[id]
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function readRecords(): LibraryArticleRecord[] {
  const parsed = libraryFile.articles.map((article) => {
    if (!isKnowledgeCategory(article.category)) {
      throw new Error(`Unknown knowledge library category: ${article.category}`)
    }

    return {
      id: article.id,
      category: article.category,
      tags: article.tags,
      title: article.title,
      content: article.content,
    }
  })

  const covered = new Set(parsed.map((article) => article.category))
  for (const category of knowledgeCategories) {
    if (!covered.has(category)) {
      throw new Error(`Knowledge library is missing ${category}`)
    }
  }

  return parsed
}

function toArticle(
  record: LibraryArticleRecord,
  language: Language,
): LibraryArticle {
  return {
    id: record.id,
    category: record.category,
    tags: record.tags,
    title: record.title[language],
    content: record.content[language],
  }
}

function isKnowledgeCategory(value: string): value is KnowledgeCategory {
  return knowledgeCategories.some((category) => category === value)
}

function readViews(): Record<string, string> {
  try {
    const raw = localStorage.getItem(viewStorageKey)
    if (!raw) {
      return {}
    }

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return {}
    }

    const views: Record<string, string> = {}
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        views[id] = value
      }
    }
    return views
  } catch {
    return {}
  }
}
