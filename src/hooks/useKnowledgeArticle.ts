import { useEffect, useState } from 'react'
import {
  getKnowledgeArticle,
  knowledgeErrorCode,
  type KnowledgeErrorCode,
} from '@/services/knowledgeService.ts'
import type { KnowledgeArticle } from '@/types/knowledge.ts'

interface KnowledgeArticleState {
  loadedId: string | undefined
  status: 'ready' | 'missing' | 'error'
  article: KnowledgeArticle | null
  errorCode: KnowledgeErrorCode | null
}

export function useKnowledgeArticle(id: string | undefined): {
  status: 'loading' | 'ready' | 'missing' | 'error'
  article: KnowledgeArticle | null
  errorCode: KnowledgeErrorCode | null
  reload: () => void
} {
  const [requestId, setRequestId] = useState(0)
  const [state, setState] = useState<KnowledgeArticleState>({
    loadedId: undefined,
    status: 'missing',
    article: null,
    errorCode: null,
  })

  useEffect(() => {
    if (!id) {
      return
    }

    let active = true

    getKnowledgeArticle(id)
      .then((article) => {
        if (!active) {
          return
        }

        if (!article) {
          setState({
            loadedId: id,
            status: 'missing',
            article: null,
            errorCode: null,
          })
          return
        }

        setState({
          loadedId: id,
          status: 'ready',
          article,
          errorCode: null,
        })
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setState({
          loadedId: id,
          status: 'error',
          article: null,
          errorCode: knowledgeErrorCode(error, 'load-one'),
        })
      })

    return () => {
      active = false
    }
  }, [id, requestId])

  const reload = (): void => {
    setRequestId((current) => current + 1)
  }

  if (!id) {
    return {
      status: 'missing',
      article: null,
      errorCode: null,
      reload,
    }
  }

  if (state.loadedId !== id) {
    return {
      status: 'loading',
      article: null,
      errorCode: null,
      reload,
    }
  }

  return {
    status: state.status,
    article: state.article,
    errorCode: state.errorCode,
    reload,
  }
}
