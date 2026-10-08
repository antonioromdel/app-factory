import type {
  KnowledgeArticle,
  KnowledgeArticleInput,
  KnowledgeCategory,
} from '@/types/knowledge.ts'
import { normalizeKnowledgeCategory } from './knowledgeDisplay.ts'

export interface KnowledgeFormState {
  title: string
  category: KnowledgeCategory | ''
  tags: string
  content: string
  favorite: boolean
}

export function emptyKnowledgeForm(): KnowledgeFormState {
  return {
    title: '',
    category: '',
    tags: '',
    content: '',
    favorite: false,
  }
}

export function formFromArticle(article: KnowledgeArticle): KnowledgeFormState {
  return {
    title: article.title,
    category: article.category,
    tags: article.tags.join(', '),
    content: article.content,
    favorite: article.favorite,
  }
}

export function toKnowledgeInput(
  form: KnowledgeFormState,
): KnowledgeArticleInput | null {
  const title = form.title.trim()
  const category = normalizeKnowledgeCategory(form.category)
  if (!title || !category) {
    return null
  }

  return {
    title,
    category,
    tags: parseTags(form.tags),
    content: form.content.trim(),
    favorite: form.favorite,
  }
}

function parseTags(value: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []

  for (const part of value.split(',')) {
    const tag = part.trim()
    const key = tag.toLocaleLowerCase()
    if (!tag || seen.has(key)) {
      continue
    }

    seen.add(key)
    tags.push(tag)
  }

  return tags
}
