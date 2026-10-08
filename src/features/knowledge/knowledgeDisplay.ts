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
}

export function normalizeKnowledgeCategory(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const category = value.trim().toLowerCase()
  return category.length > 0 ? category : null
}

export function knowledgeCategoryLabel(
  category: string,
  labels: object,
): string {
  const known = labels as Record<string, unknown>
  const label = known[category]
  if (typeof label === 'string' && label.trim().length > 0) {
    return label
  }

  return humanizeKnowledgeCategory(category)
}

export function uniqueKnowledgeCategories(
  values: readonly unknown[],
): string[] {
  const seen = new Set<string>()
  const categories: string[] = []

  for (const value of values) {
    const category = normalizeKnowledgeCategory(value)
    if (!category || seen.has(category)) {
      continue
    }

    seen.add(category)
    categories.push(category)
  }

  return categories
}

export function sortKnowledgeCategories(
  categories: readonly string[],
  labels: object,
  locale: string,
): string[] {
  return [...categories].sort((left, right) =>
    knowledgeCategoryLabel(left, labels).localeCompare(
      knowledgeCategoryLabel(right, labels),
      locale,
    ),
  )
}

export function knowledgeDateLabel(value: Date, locale: string): string {
  return value.toLocaleDateString(locale, { dateStyle: 'medium' })
}

function humanizeKnowledgeCategory(category: string): string {
  return category
    .split(/[-_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
