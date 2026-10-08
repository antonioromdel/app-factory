import { useEffect, useId, useRef, useState, type ReactElement } from 'react'
import { Link, useNavigate } from 'react-router'
import { Input } from '@/components/Input.tsx'
import { Modal } from '@/components/Modal.tsx'
import { knowledgeCategoryLabel } from '@/features/knowledge/knowledgeDisplay.ts'
import { libraryArticles } from '@/features/knowledge/knowledgeLibrary.ts'
import { useApplications } from '@/hooks/useApplications.ts'
import { useKnowledgeArticles } from '@/hooks/useKnowledgeArticles.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  buildSearchResults,
  type SearchHit,
} from '@/features/search/searchResults.ts'
import styles from './GlobalSearch.module.css'

export function GlobalSearch({
  open,
  session,
  onClose,
}: {
  open: boolean
  session: number
  onClose: () => void
}): ReactElement {
  const navigate = useNavigate()
  const { language, messages } = useLanguage()
  const applications = useApplications()
  const knowledge = useKnowledgeArticles()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [seenSession, setSeenSession] = useState(session)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const sessionChanged = seenSession !== session
  const currentQuery = sessionChanged ? '' : query
  const currentActive = sessionChanged ? 0 : active

  if (sessionChanged) {
    setSeenSession(session)
    setQuery('')
    setActive(0)
  }
  const groups = buildSearchResults(
    currentQuery,
    applications.status === 'ready' ? applications.applications : [],
    [
      ...libraryArticles(language).map((article) => ({
        id: article.id,
        title: article.title,
        categoryLabel: knowledgeCategoryLabel(
          article.category,
          messages.knowledge.categories,
        ),
        tags: article.tags,
        content: article.content,
        included: true,
      })),
      ...(knowledge.status === 'ready'
        ? knowledge.articles.map((article) => ({
            id: article.id,
            title: article.title,
            categoryLabel: knowledgeCategoryLabel(
              article.category,
              messages.knowledge.categories,
            ),
            tags: article.tags,
            content: article.content,
            included: false,
          }))
        : []),
    ],
    messages,
  )
  const hits = groups.flatMap((group) => group.hits)
  const offsets = new Map<string, number>()
  {
    let cursor = 0
    for (const group of groups) {
      offsets.set(group.id, cursor)
      cursor += group.hits.length
    }
  }
  const selected =
    hits.length === 0 ? 0 : Math.min(currentActive, hits.length - 1)
  const waiting =
    applications.status === 'loading' || knowledge.status === 'loading'
  const trimmed = currentQuery.trim()

  useEffect(() => {
    if (!open) {
      return
    }

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
    })

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [open, session])

  useEffect(() => {
    if (!open) {
      return
    }

    document.getElementById(`${listId}-${selected}`)?.scrollIntoView({
      block: 'nearest',
    })
  }, [open, listId, selected, trimmed])

  function openHit(hit: SearchHit): void {
    navigate(hit.to)
    onClose()
  }

  return (
    <Modal
      open={open}
      title={messages.search.open}
      panelClassName={styles.panel}
      onClose={onClose}
    >
      <Input
        ref={inputRef}
        label={messages.search.placeholder}
        hideLabel
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          hits.length > 0 ? `${listId}-${selected}` : undefined
        }
        placeholder={messages.search.placeholder}
        value={currentQuery}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActive((current) =>
              Math.min(current + 1, Math.max(hits.length - 1, 0)),
            )
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((current) => Math.max(current - 1, 0))
          }

          const hit = hits[selected]
          if (event.key === 'Enter' && hit) {
            event.preventDefault()
            openHit(hit)
          }
        }}
      />

      {waiting ? (
        <p className={styles.status}>{messages.search.loading}</p>
      ) : null}
      {applications.status === 'error' ? (
        <p className={styles.status} role="alert">
          {messages.applicationErrors[applications.errorCode ?? 'load-list']}
        </p>
      ) : null}
      {knowledge.status === 'error' ? (
        <p className={styles.status} role="alert">
          {messages.knowledge.errors[knowledge.errorCode ?? 'load-list']}
        </p>
      ) : null}

      {!trimmed ? (
        <p className={styles.status}>{messages.search.hint}</p>
      ) : null}
      {trimmed && hits.length === 0 && !waiting ? (
        <p className={styles.status}>{messages.search.empty}</p>
      ) : null}

      {hits.length > 0 ? (
        <div id={listId} className={styles.results} role="listbox">
          {groups.map((group) => {
            const start = offsets.get(group.id) ?? 0

            return (
              <div
                key={group.id}
                role="group"
                aria-label={messages.search.groups[group.id]}
              >
                <h3 className={styles.groupTitle}>
                  {messages.search.groups[group.id]}
                  {group.total > group.hits.length
                    ? ` · ${messages.search.more(group.total - group.hits.length)}`
                    : ''}
                </h3>
                <ul className={styles.group}>
                  {group.hits.map((hit, offset) => {
                    const index = start + offset
                    const isSelected = index === selected

                    return (
                      <li key={hit.id}>
                        <Link
                          id={`${listId}-${index}`}
                          className={
                            isSelected
                              ? `${styles.hit} ${styles.selected}`
                              : styles.hit
                          }
                          role="option"
                          aria-selected={isSelected}
                          to={hit.to}
                          onClick={onClose}
                          onMouseEnter={() => setActive(index)}
                        >
                          <span className={styles.hitTitle}>{hit.title}</span>
                          {hit.detail ? (
                            <span className={styles.hitDetail}>
                              {hit.detail}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      ) : null}
    </Modal>
  )
}
