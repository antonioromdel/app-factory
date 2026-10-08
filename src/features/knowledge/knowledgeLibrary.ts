import type { Language } from '@/app/languageContext.ts'
import type { KnowledgeCategory } from '@/types/knowledge.ts'
import { normalizeKnowledgeCategory } from './knowledgeDisplay.ts'
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

function readRecords(): LibraryArticleRecord[] {
  return libraryFile.articles.map((article) => {
    const category = normalizeKnowledgeCategory(article.category)
    if (!category) {
      throw new Error(
        `Knowledge library article ${article.id} is missing a category`,
      )
    }

    return {
      id: article.id,
      category,
      tags: article.tags,
      title: article.title,
      content: article.content,
    }
  })
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

