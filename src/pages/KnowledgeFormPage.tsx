import { useState, type ReactElement } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { KnowledgeForm } from '@/features/knowledge/KnowledgeForm.tsx'
import { isLibraryArticleId } from '@/features/knowledge/knowledgeLibrary.ts'
import {
  emptyKnowledgeForm,
  formFromArticle,
} from '@/features/knowledge/knowledgeFormState.ts'
import { useKnowledgeArticle } from '@/hooks/useKnowledgeArticle.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  createKnowledgeArticle,
  knowledgeErrorCode,
  updateKnowledgeArticle,
  type KnowledgeErrorCode,
} from '@/services/knowledgeService.ts'
import type { KnowledgeArticleInput } from '@/types/knowledge.ts'

export function KnowledgeCreatePage(): ReactElement {
  const navigate = useNavigate()
  const { messages } = useLanguage()
  const [errorCode, setErrorCode] = useState<KnowledgeErrorCode | null>(null)

  async function handleSubmit(input: KnowledgeArticleInput): Promise<void> {
    setErrorCode(null)

    try {
      const id = await createKnowledgeArticle(input)
      navigate(`/knowledge/${id}`)
    } catch (error: unknown) {
      setErrorCode(knowledgeErrorCode(error, 'create'))
      throw error
    }
  }

  return (
    <KnowledgeForm
      initial={emptyKnowledgeForm()}
      submitLabel={messages.knowledge.create}
      errorCode={errorCode}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/knowledge')}
    />
  )
}

export function KnowledgeEditPage(): ReactElement {
  const { articleId } = useParams()

  if (articleId && isLibraryArticleId(articleId)) {
    return <Navigate to={`/knowledge/${articleId}`} replace />
  }

  return <KnowledgeEditForm />
}

function KnowledgeEditForm(): ReactElement {
  const { articleId } = useParams()
  const navigate = useNavigate()
  const { messages } = useLanguage()
  const { status, article, errorCode, reload } = useKnowledgeArticle(articleId)
  const [saveError, setSaveError] = useState<KnowledgeErrorCode | null>(null)

  if (status === 'loading') {
    return <LoadingState message={messages.knowledge.loadingArticle} />
  }

  if (status === 'error') {
    return (
      <ErrorState
        message={messages.knowledge.errors[errorCode ?? 'load-one']}
        onRetry={reload}
      />
    )
  }

  if (status === 'missing' || !article) {
    return (
      <EmptyState
        title={messages.knowledge.notFound}
        action={<Link to="/knowledge">{messages.knowledge.back}</Link>}
      />
    )
  }

  async function handleSubmit(input: KnowledgeArticleInput): Promise<void> {
    if (!article) {
      return
    }

    setSaveError(null)

    try {
      await updateKnowledgeArticle(article.id, input)
      navigate(`/knowledge/${article.id}`)
    } catch (error: unknown) {
      setSaveError(knowledgeErrorCode(error, 'save'))
      throw error
    }
  }

  return (
    <KnowledgeForm
      key={article.id}
      initial={formFromArticle(article)}
      submitLabel={messages.knowledge.save}
      errorCode={saveError}
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/knowledge/${article.id}`)}
    />
  )
}
