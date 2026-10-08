import type { Timestamp } from 'firebase/firestore'

export const knowledgeCategories = [
  'flutter',
  'firebase',
  'android',
  'ios',
  'admob',
  'monetization',
  'publishing',
  'git',
  'testing',
  'architecture',
  'uiux',
  'performance',
  'security',
  'troubleshooting',
] as const

export type KnowledgeCategory = (typeof knowledgeCategories)[number]

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
