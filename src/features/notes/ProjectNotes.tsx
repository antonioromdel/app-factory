import { useState, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Input } from '@/components/Input.tsx'
import { TextArea } from '@/components/TextArea.tsx'
import {
  draftFromNotes,
  matchingNoteKinds,
  noteDraftsDiffer,
  noteSignature,
  notesFromDraft,
  type ProjectNoteKind,
} from '@/features/notes/projectNotes.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  applicationErrorCode,
  saveApplicationNotes,
  type ApplicationErrorCode,
} from '@/services/applicationService.ts'
import type { ApplicationNotes } from '@/types/application.ts'
import styles from './ProjectNotes.module.css'

export function ProjectNotes({
  applicationId,
  notes,
  onSaved,
}: {
  applicationId: string
  notes: ApplicationNotes | undefined
  onSaved: () => void
}): ReactElement {
  const { messages } = useLanguage()
  const labels: Record<ProjectNoteKind, string> = {
    technicalNotes: messages.fields.technicalNotes,
    knownIssues: messages.fields.knownIssues,
    ideas: messages.fields.ideas,
    architectureDecisions: messages.fields.architectureDecisions,
    importantCommands: messages.fields.importantCommands,
    lessonsLearned: messages.fields.lessonsLearned,
  }
  const incoming = draftFromNotes(notes)
  const signature = noteSignature(notes)
  const [trackedSignature, setTrackedSignature] = useState(signature)
  const [draft, setDraft] = useState(incoming)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<ApplicationErrorCode | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  )

  if (trackedSignature !== signature) {
    setTrackedSignature(signature)
    setDraft(incoming)
  }

  const current = trackedSignature === signature ? draft : incoming
  const visible = matchingNoteKinds(current, query, labels)
  const dirty = noteDraftsDiffer(current, incoming)

  function updateKind(kind: ProjectNoteKind, value: string): void {
    setDraft({ ...current, [kind]: value })
    setNotice(null)
    setCopyState('idle')
  }

  async function save(): Promise<void> {
    setSaving(true)
    setNotice(null)
    setErrorCode(null)
    try {
      const saved = notesFromDraft(current)
      await saveApplicationNotes(applicationId, saved)
      setDraft(draftFromNotes(saved))
      setNotice(messages.projectNotes.saved)
      onSaved()
    } catch (error: unknown) {
      setErrorCode(applicationErrorCode(error, 'save'))
    } finally {
      setSaving(false)
    }
  }

  async function copyCommands(): Promise<void> {
    const text = current.importantCommands.trim()
    if (!text) {
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopyState('copied')
    } catch (error: unknown) {
      console.error(error)
      setCopyState('failed')
    }
  }

  const copyLabel =
    copyState === 'copied'
      ? messages.projectNotes.copied
      : copyState === 'failed'
        ? messages.projectNotes.copyFailed
        : messages.projectNotes.copyCommands

  return (
    <section className={styles.section}>
      <p className={styles.lead}>{messages.projectNotes.lead}</p>
      <Input
        className={styles.search}
        label={messages.projectNotes.search}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      {errorCode ? (
        <ErrorState message={messages.applicationErrors[errorCode]} />
      ) : null}
      {visible.length === 0 ? (
        <EmptyState
          title={messages.projectNotes.emptySearchTitle}
          description={messages.projectNotes.emptySearchDescription}
        />
      ) : (
        <div className={styles.list}>
          {visible.map((kind) => (
            <div key={kind} className={styles.note}>
              <TextArea
                className={
                  kind === 'importantCommands' ? styles.commands : undefined
                }
                label={labels[kind]}
                value={current[kind]}
                disabled={saving}
                onChange={(event) => updateKind(kind, event.target.value)}
              />
              {kind === 'importantCommands' &&
              current.importantCommands.trim() ? (
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void copyCommands()}
                  >
                    {copyLabel}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <Button
        disabled={saving || !dirty}
        aria-busy={saving}
        onClick={() => void save()}
      >
        {saving ? messages.projectNotes.saving : messages.projectNotes.save}
      </Button>
    </section>
  )
}
