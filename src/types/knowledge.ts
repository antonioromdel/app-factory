import type { Timestamp } from 'firebase/firestore'

export type KnowledgeCategory = string

export interface KnowledgeArticle {
  id: string
  title: string
  category: KnowledgeCategory
  tags: string[]
  content: string
  favorite: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  viewedAt?: Timestamp
}

export interface KnowledgeArticleInput {
  title: string
  category: KnowledgeCategory
  tags: string[]
  content: string
  favorite: boolean
}
