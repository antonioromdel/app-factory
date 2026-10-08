import { useEffect, useState } from 'react'
import {
  knowledgeErrorCode,
  listKnowledgeArticles,
  type KnowledgeErrorCode,
} from '@/services/knowledgeService.ts'
import type { KnowledgeArticle } from '@/types/knowledge.ts'

interface KnowledgeListState {
  status: 'loading' | 'ready' | 'error'
  articles: KnowledgeArticle[]
  errorCode: KnowledgeErrorCode | null
}

export function useKnowledgeArticles(): KnowledgeListState & {
  reload: () => void
} {
  const [requestId, setRequestId] = useState(0)
  const [state, setState] = useState<KnowledgeListState>({
    status: 'loading',
    articles: [],
    errorCode: null,
  })

  useEffect(() => {
    let active = true

    listKnowledgeArticles()
      .then((articles) => {
        if (active) {
          setState({ status: 'ready', articles, errorCode: null })
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setState({
          status: 'error',
          articles: [],
          errorCode: knowledgeErrorCode(error, 'load-list'),
        })
      })

    return () => {
      active = false
    }
  }, [requestId])

  return {
    ...state,
    reload: () => {
      setRequestId((current) => current + 1)
    },
  }
}
