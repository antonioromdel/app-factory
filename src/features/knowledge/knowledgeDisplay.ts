import type { KnowledgeCategory } from '@/types/knowledge.ts'

export interface ListedKnowledgeArticle {
  id: string
  title: string
  category: KnowledgeCategory
  tags: string[]
  content: string
  favorite: boolean
  source: 'library' | 'user'
  updatedAt: Date | null
  viewedAt: Date | null
}

export function knowledgeDateLabel(value: Date, locale: string): string {
  return value.toLocaleDateString(locale, { dateStyle: 'medium' })
}
