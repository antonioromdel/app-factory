import { useState, type ReactElement } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/Badge.tsx'
import { Button } from '@/components/Button.tsx'
import { ConfirmDialog } from '@/components/ConfirmDialog.tsx'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Input } from '@/components/Input.tsx'
import { Select } from '@/components/Select.tsx'
import { Switch } from '@/components/Switch.tsx'
import {
  knowledgeCategoryLabel,
  knowledgeDateLabel,
  sortKnowledgeCategories,
  uniqueKnowledgeCategories,
  type ListedKnowledgeArticle,
} from '@/features/knowledge/knowledgeDisplay.ts'
import { libraryArticles } from '@/features/knowledge/knowledgeLibrary.ts'
import { useKnowledgeArticles } from '@/hooks/useKnowledgeArticles.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { Messages } from '@/i18n/en.ts'
import {
  deleteKnowledgeArticle,
  knowledgeErrorCode,
  setKnowledgeFavorite,
} from '@/services/knowledgeService.ts'
import type { KnowledgeArticle } from '@/types/knowledge.ts'
import styles from './KnowledgePage.module.css'

export function KnowledgePage(): ReactElement {
  const { language, messages } = useLanguage()
  const { status, articles, errorCode, reload } = useKnowledgeArticles()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [pendingDelete, setPendingDelete] =
    useState<ListedKnowledgeArticle | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const listed = [
    ...libraryArticles(language).map(toListedLibrary),
    ...(status === 'ready' ? articles.map(toListedUser) : []),
  ]
  const categories = sortKnowledgeCategories(
    uniqueKnowledgeCategories(listed.map((article) => article.category)),
    messages.knowledge.categories,
    language,
  )
  const filtered = sortArticles(
    listed.filter((article) =>
      matchesArticle(article, query, category, favoritesOnly, messages),
    ),
    messages.knowledge.categories,
    language,
  )
  async function handleFavorite(
    article: ListedKnowledgeArticle,
  ): Promise<void> {
    if (article.source !== 'user') {
      return
    }

    setActionError(null)
    setBusyId(article.id)

    try {
      await setKnowledgeFavorite(article.id, !article.favorite)
      reload()
    } catch (error: unknown) {
      setActionError(
        messages.knowledge.errors[knowledgeErrorCode(error, 'save')],
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!pendingDelete || pendingDelete.source !== 'user') {
      return
    }

    setActionError(null)
    setBusyId(pendingDelete.id)

    try {
      await deleteKnowledgeArticle(pendingDelete.id)
      setPendingDelete(null)
      reload()
    } catch (error: unknown) {
      setActionError(
        messages.knowledge.errors[knowledgeErrorCode(error, 'delete')],
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={styles.page}>
      <p className={styles.lead}>{messages.knowledge.libraryLead}</p>
      <div className={styles.toolbar}>
        <Input
          className={styles.search}
          label={messages.knowledge.search}
          hideLabel
          type="search"
          placeholder={messages.knowledge.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          className={styles.filter}
          label={messages.knowledge.category}
          value={category}
          options={[
            { value: '', label: messages.knowledge.allCategories },
            ...categories.map((item) => ({
              value: item,
              label: knowledgeCategoryLabel(
                item,
                messages.knowledge.categories,
              ),
            })),
          ]}
          onChange={(event) => setCategory(event.target.value)}
        />
        <Switch
          label={messages.knowledge.favoritesOnly}
          checked={favoritesOnly}
          onChange={(event) => setFavoritesOnly(event.target.checked)}
        />
        <Link className={styles.create} to="/knowledge/new">
          {messages.knowledge.newArticle}
        </Link>
      </div>

      {status === 'loading' ? (
        <p className={styles.lead}>{messages.knowledge.loadingYours}</p>
      ) : null}

      {status === 'error' ? (
        <ErrorState
          message={messages.knowledge.errors[errorCode ?? 'load-list']}
          onRetry={reload}
        />
      ) : null}

      {actionError ? <ErrorState message={actionError} /> : null}

      {filtered.length === 0 ? (
        <EmptyState
          title={messages.knowledge.noMatchesTitle}
          description={messages.knowledge.noMatchesDescription}
        />
      ) : null}

      {filtered.length > 0 ? (
        <ul className={styles.list} aria-label={messages.nav.knowledge}>
          {filtered.map((article) => (
            <ArticleRow
              key={article.id}
              article={article}
              locale={language}
              busy={busyId === article.id}
              onTag={setQuery}
              onFavorite={() => void handleFavorite(article)}
              onDelete={() => setPendingDelete(article)}
            />
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={messages.knowledge.deleteTitle}
        description={
          pendingDelete
            ? messages.knowledge.deleteDescription(pendingDelete.title)
            : ''
        }
        confirmLabel={messages.knowledge.delete}
        cancelLabel={messages.common.cancel}
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

function ArticleRow({
  article,
  locale,
  busy,
  onTag,
  onFavorite,
  onDelete,
}: {
  article: ListedKnowledgeArticle
  locale: string
  busy: boolean
  onTag: (tag: string) => void
  onFavorite: () => void
  onDelete: () => void
}): ReactElement {
  const { messages } = useLanguage()

  return (
    <li className={styles.item}>
      <div className={styles.itemMain}>
        <Link className={styles.title} to={`/knowledge/${article.id}`}>
          {article.title}
        </Link>
        <div className={styles.meta}>
          <Badge>
            {knowledgeCategoryLabel(
              article.category,
              messages.knowledge.categories,
            )}
          </Badge>
          {article.source === 'library' ? (
            <Badge tone="info">{messages.knowledge.library}</Badge>
          ) : null}
          {article.favorite ? (
            <Badge tone="warning">{messages.knowledge.favorite}</Badge>
          ) : null}
          {article.updatedAt ? (
            <span className={styles.date}>
              {knowledgeDateLabel(article.updatedAt, locale)}
            </span>
          ) : null}
        </div>
        {article.tags.length > 0 ? (
          <div className={styles.tags}>
            {article.tags.map((tag) => (
              <button
                key={tag}
                className={styles.tag}
                type="button"
                onClick={() => onTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {article.source === 'user' ? (
        <div className={styles.actions}>
          <Button variant="secondary" disabled={busy} onClick={onFavorite}>
            {article.favorite
              ? messages.knowledge.removeFavorite
              : messages.knowledge.addFavorite}
          </Button>
          <Link className={styles.edit} to={`/knowledge/${article.id}/edit`}>
            {messages.knowledge.edit}
          </Link>
          <Button variant="danger" disabled={busy} onClick={onDelete}>
            {messages.knowledge.delete}
          </Button>
        </div>
      ) : null}
    </li>
  )
}

function toListedLibrary(article: {
  id: string
  title: string
  category: string
  tags: string[]
  content: string
}): ListedKnowledgeArticle {
  return {
    ...article,
    favorite: false,
    source: 'library',
    updatedAt: null,
  }
}

function toListedUser(article: KnowledgeArticle): ListedKnowledgeArticle {
  return {
    id: article.id,
    title: article.title,
    category: article.category,
    tags: article.tags,
    content: article.content,
    favorite: article.favorite,
    source: 'user',
    updatedAt: article.updatedAt.toDate(),
  }
}

function matchesArticle(
  article: ListedKnowledgeArticle,
  query: string,
  category: string,
  favoritesOnly: boolean,
  messages: Messages,
): boolean {
  if (category && article.category !== category) {
    return false
  }

  if (favoritesOnly && !article.favorite) {
    return false
  }

  const needle = query.trim().toLocaleLowerCase()
  if (!needle) {
    return true
  }

  const haystack = [
    article.title,
    article.content,
    article.tags.join(' '),
    knowledgeCategoryLabel(article.category, messages.knowledge.categories),
  ]
    .join(' ')
    .toLocaleLowerCase()

  return haystack.includes(needle)
}

function sortArticles(
  articles: ListedKnowledgeArticle[],
  labels: object,
  locale: string,
): ListedKnowledgeArticle[] {
  return [...articles].sort((left, right) => {
    if (left.favorite !== right.favorite) {
      return left.favorite ? -1 : 1
    }

    const categoryDelta = knowledgeCategoryLabel(
      left.category,
      labels,
    ).localeCompare(knowledgeCategoryLabel(right.category, labels), locale)
    if (categoryDelta !== 0) {
      return categoryDelta
    }

    if (left.source !== right.source) {
      return left.source === 'library' ? -1 : 1
    }

    return (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0)
  })
}
