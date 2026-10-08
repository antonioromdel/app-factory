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
  knowledgeDateLabel,
  type ListedKnowledgeArticle,
} from '@/features/knowledge/knowledgeDisplay.ts'
import {
  libraryArticles,
  libraryViewedAt,
} from '@/features/knowledge/knowledgeLibrary.ts'
import { useKnowledgeArticles } from '@/hooks/useKnowledgeArticles.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { Messages } from '@/i18n/en.ts'
import {
  deleteKnowledgeArticle,
  knowledgeErrorCode,
  setKnowledgeFavorite,
} from '@/services/knowledgeService.ts'
import {
  knowledgeCategories,
  type KnowledgeArticle,
  type KnowledgeCategory,
} from '@/types/knowledge.ts'
import styles from './KnowledgePage.module.css'

export function KnowledgePage(): ReactElement {
  const { language, messages } = useLanguage()
  const { status, articles, errorCode, reload } = useKnowledgeArticles()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<KnowledgeCategory | ''>('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [pendingDelete, setPendingDelete] =
    useState<ListedKnowledgeArticle | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const listed = [
    ...libraryArticles(language).map((article) =>
      toListedLibrary(article, libraryViewedAt(article.id)),
    ),
    ...(status === 'ready' ? articles.map(toListedUser) : []),
  ]
  const filtered = sortArticles(
    listed.filter((article) =>
      matchesArticle(article, query, category, favoritesOnly, messages),
    ),
  )
  const showRecent =
    query.trim().length === 0 && category === '' && !favoritesOnly
  const recent = showRecent ? recentArticles(listed) : []

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
            ...knowledgeCategories.map((item) => ({
              value: item,
              label: messages.knowledge.categories[item],
            })),
          ]}
          onChange={(event) => {
            const value = event.target.value
            setCategory(isKnowledgeCategory(value) ? value : '')
          }}
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

      {recent.length > 0 ? (
        <section
          className={styles.section}
          aria-label={messages.knowledge.recent}
        >
          <h2 className={styles.sectionTitle}>{messages.knowledge.recent}</h2>
          <ul className={styles.list}>
            {recent.map((article) => (
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
        </section>
      ) : null}

      {filtered.length > 0 ? (
        <section
          className={styles.section}
          aria-label={
            recent.length > 0
              ? messages.knowledge.allArticles
              : messages.nav.knowledge
          }
        >
          {recent.length > 0 ? (
            <h2 className={styles.sectionTitle}>
              {messages.knowledge.allArticles}
            </h2>
          ) : null}
          <ul className={styles.list}>
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
        </section>
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
          <Badge>{messages.knowledge.categories[article.category]}</Badge>
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

function toListedLibrary(
  article: {
    id: string
    title: string
    category: KnowledgeCategory
    tags: string[]
    content: string
  },
  viewedAt: Date | null,
): ListedKnowledgeArticle {
  return {
    ...article,
    favorite: false,
    source: 'library',
    updatedAt: null,
    viewedAt,
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
    viewedAt: article.viewedAt?.toDate() ?? null,
  }
}

function matchesArticle(
  article: ListedKnowledgeArticle,
  query: string,
  category: KnowledgeCategory | '',
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
    messages.knowledge.categories[article.category],
  ]
    .join(' ')
    .toLocaleLowerCase()

  return haystack.includes(needle)
}

function sortArticles(
  articles: ListedKnowledgeArticle[],
): ListedKnowledgeArticle[] {
  return [...articles].sort((left, right) => {
    if (left.favorite !== right.favorite) {
      return left.favorite ? -1 : 1
    }

    const categoryDelta =
      knowledgeCategories.indexOf(left.category) -
      knowledgeCategories.indexOf(right.category)
    if (categoryDelta !== 0) {
      return categoryDelta
    }

    if (left.source !== right.source) {
      return left.source === 'library' ? -1 : 1
    }

    return (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0)
  })
}

function recentArticles(
  articles: ListedKnowledgeArticle[],
): ListedKnowledgeArticle[] {
  return articles
    .filter((article) => article.viewedAt)
    .sort(
      (left, right) =>
        (right.viewedAt?.getTime() ?? 0) - (left.viewedAt?.getTime() ?? 0),
    )
    .slice(0, 5)
}

function isKnowledgeCategory(value: string): value is KnowledgeCategory {
  return knowledgeCategories.some((category) => category === value)
}
