import { useEffect, useState, type ReactElement } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Badge } from '@/components/Badge.tsx'
import { Button } from '@/components/Button.tsx'
import { ConfirmDialog } from '@/components/ConfirmDialog.tsx'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { KnowledgeArticleBody } from '@/features/knowledge/KnowledgeArticleBody.tsx'
import {
  knowledgeCategoryLabel,
  knowledgeDateLabel,
} from '@/features/knowledge/knowledgeDisplay.ts'
import {
  isLibraryArticleId,
  libraryArticle,
} from '@/features/knowledge/knowledgeLibrary.ts'
import { useKnowledgeArticle } from '@/hooks/useKnowledgeArticle.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  deleteKnowledgeArticle,
  knowledgeErrorCode,
  markKnowledgeViewed,
  setKnowledgeFavorite,
} from '@/services/knowledgeService.ts'
import styles from './KnowledgeArticlePage.module.css'

export function KnowledgeArticlePage(): ReactElement {
  const { articleId } = useParams()

  if (articleId && isLibraryArticleId(articleId)) {
    return <LibraryArticleView articleId={articleId} />
  }

  return <UserKnowledgeArticlePage />
}

function LibraryArticleView({
  articleId,
}: {
  articleId: string
}): ReactElement {
  const { language, messages } = useLanguage()
  const article = libraryArticle(articleId, language)

  if (!article) {
    return (
      <EmptyState
        title={messages.knowledge.notFound}
        description={messages.knowledge.removed}
        action={
          <Link className={styles.back} to="/knowledge">
            {messages.knowledge.back}
          </Link>
        }
      />
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{article.title}</h2>
          <div className={styles.meta}>
            <Badge>
              {knowledgeCategoryLabel(
                article.category,
                messages.knowledge.categories,
              )}
            </Badge>
            <Badge tone="info">{messages.knowledge.library}</Badge>
          </div>
        </div>
      </div>

      {article.tags.length > 0 ? (
        <ul className={styles.tags}>
          {article.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      ) : null}

      <p className={styles.dates}>{messages.knowledge.libraryLead}</p>
      <KnowledgeArticleBody content={article.content} />
    </div>
  )
}

function UserKnowledgeArticlePage(): ReactElement {
  const { articleId } = useParams()
  const navigate = useNavigate()
  const { language, messages } = useLanguage()
  const { status, article, errorCode, reload } = useKnowledgeArticle(articleId)
  const [favorite, setFavorite] = useState<boolean | null>(null)
  const [isSavingFavorite, setIsSavingFavorite] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const viewedId = status === 'ready' ? article?.id : undefined

  useEffect(() => {
    if (!viewedId) {
      return
    }

    void markKnowledgeViewed(viewedId).catch((error: unknown) => {
      console.error(error)
    })
  }, [viewedId])

  if (status === 'loading') {
    return <LoadingState message={messages.knowledge.loadingArticle} />
  }

  if (status === 'missing') {
    return (
      <EmptyState
        title={messages.knowledge.notFound}
        description={messages.knowledge.removed}
        action={
          <Link className={styles.back} to="/knowledge">
            {messages.knowledge.back}
          </Link>
        }
      />
    )
  }

  if (status === 'error' || !article) {
    return (
      <ErrorState
        message={messages.knowledge.errors[errorCode ?? 'load-one']}
        onRetry={reload}
      />
    )
  }

  const isFavorite = favorite ?? article.favorite

  async function handleFavorite(): Promise<void> {
    if (!article) {
      return
    }

    const next = !isFavorite
    setActionError(null)
    setIsSavingFavorite(true)
    setFavorite(next)

    try {
      await setKnowledgeFavorite(article.id, next)
    } catch (error: unknown) {
      setFavorite(article.favorite)
      setActionError(
        messages.knowledge.errors[knowledgeErrorCode(error, 'save')],
      )
    } finally {
      setIsSavingFavorite(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!article) {
      return
    }

    setActionError(null)
    setIsDeleting(true)

    try {
      await deleteKnowledgeArticle(article.id)
      navigate('/knowledge')
    } catch (error: unknown) {
      setActionError(
        messages.knowledge.errors[knowledgeErrorCode(error, 'delete')],
      )
      setIsDeleting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{article.title}</h2>
          <div className={styles.meta}>
            <Badge>
              {knowledgeCategoryLabel(
                article.category,
                messages.knowledge.categories,
              )}
            </Badge>
            {isFavorite ? (
              <Badge tone="warning">{messages.knowledge.favorite}</Badge>
            ) : null}
          </div>
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            disabled={isSavingFavorite || isDeleting}
            onClick={() => void handleFavorite()}
          >
            {isSavingFavorite
              ? messages.common.saving
              : isFavorite
                ? messages.knowledge.removeFavorite
                : messages.knowledge.addFavorite}
          </Button>
          <Link className={styles.edit} to={`/knowledge/${article.id}/edit`}>
            {messages.knowledge.edit}
          </Link>
          <Button
            variant="danger"
            disabled={isDeleting}
            onClick={() => setConfirmDelete(true)}
          >
            {messages.knowledge.delete}
          </Button>
        </div>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {article.tags.length > 0 ? (
        <ul className={styles.tags}>
          {article.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      ) : null}

      <p className={styles.dates}>
        {messages.knowledge.updated}:{' '}
        {knowledgeDateLabel(article.updatedAt.toDate(), language)}
        {article.viewedAt
          ? ` · ${messages.knowledge.viewed}: ${knowledgeDateLabel(article.viewedAt.toDate(), language)}`
          : ''}
      </p>

      {article.content ? (
        <KnowledgeArticleBody content={article.content} />
      ) : (
        <EmptyState
          title={messages.knowledge.emptyContentTitle}
          description={messages.knowledge.emptyContentDescription}
          action={
            <Link className={styles.edit} to={`/knowledge/${article.id}/edit`}>
              {messages.knowledge.edit}
            </Link>
          }
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={messages.knowledge.deleteTitle}
        description={messages.knowledge.deleteDescription(article.title)}
        confirmLabel={messages.knowledge.delete}
        cancelLabel={messages.common.cancel}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
