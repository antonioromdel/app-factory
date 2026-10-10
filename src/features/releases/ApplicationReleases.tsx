import { useState, type ReactElement } from 'react'
import { Badge } from '@/components/Badge.tsx'
import { Button } from '@/components/Button.tsx'
import { ConfirmDialog } from '@/components/ConfirmDialog.tsx'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Input } from '@/components/Input.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { Modal } from '@/components/Modal.tsx'
import { Select } from '@/components/Select.tsx'
import { TextArea } from '@/components/TextArea.tsx'
import { ReleasePreparation } from '@/features/releases/ReleasePreparation.tsx'
import {
  initialPreparationSteps,
  runPreparationSteps,
  type PreparationStep,
} from '@/features/releases/releasePreparation.ts'
import {
  formatReleaseDate,
  releaseInputFromFields,
  todayDateInput,
} from '@/features/releases/releaseRecord.ts'
import { useApplicationReleases } from '@/hooks/useApplicationReleases.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  preparationErrorCodes,
  runReleasePreparationStep,
  type PreparationErrorCode,
} from '@/services/localReleasePreparationService.ts'
import {
  createRelease,
  deleteRelease,
  releaseErrorCode,
  updateRelease,
  type ReleaseErrorCode,
} from '@/services/releaseService.ts'
import {
  releasePlatforms,
  releaseStatuses,
  type Release,
  type ReleaseFieldError,
  type ReleasePlatform,
  type ReleaseStatus,
} from '@/types/release.ts'
import styles from './ApplicationReleases.module.css'

const statusTone = {
  draft: 'neutral',
  testing: 'info',
  ready: 'warning',
  released: 'success',
  rejected: 'danger',
} as const

export function ApplicationReleases({
  applicationId,
  directory,
}: {
  applicationId: string
  directory?: string
}): ReactElement {
  const { language, messages } = useLanguage()
  const { status, releases, errorCode, reload } =
    useApplicationReleases(applicationId)
  const [editor, setEditor] = useState<Release | 'new' | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Release | null>(null)
  const [actionError, setActionError] = useState<ReleaseErrorCode | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmingPrepare, setConfirmingPrepare] = useState<Release | null>(
    null,
  )
  const [preparing, setPreparing] = useState<Release | null>(null)
  const [prepareSteps, setPrepareSteps] = useState<PreparationStep[]>(
    initialPreparationSteps,
  )
  const [prepareRunning, setPrepareRunning] = useState(false)
  const [prepareError, setPrepareError] = useState<PreparationErrorCode | null>(
    null,
  )

  async function handleDelete(): Promise<void> {
    if (!pendingDelete) {
      return
    }
    setDeleting(true)
    setActionError(null)
    setNotice(null)
    try {
      await deleteRelease(applicationId, pendingDelete.id)
      setPendingDelete(null)
      reload()
    } catch (error: unknown) {
      setActionError(releaseErrorCode(error, 'delete'))
    } finally {
      setDeleting(false)
    }
  }

  async function handlePrepare(): Promise<void> {
    if (!confirmingPrepare || !directory) {
      return
    }

    const release = confirmingPrepare
    setConfirmingPrepare(null)
    setPreparing(release)
    setPrepareRunning(true)
    setPrepareError(null)
    const result = await runPreparationSteps(
      release,
      (step, targets) =>
        runReleasePreparationStep(directory, step, release, targets),
      setPrepareSteps,
    )
    const errorCode = preparationErrorCodes.find(
      (code) => code === result.errorCode,
    )
    setPrepareError(errorCode ?? (result.errorCode ? 'invalid-request' : null))
    setPrepareRunning(false)
  }

  return (
    <section className={styles.section}>
      <p className={styles.lead}>{messages.releases.lead}</p>
      <Button
        onClick={() => {
          setNotice(null)
          setActionError(null)
          setEditor('new')
        }}
      >
        {messages.releases.create}
      </Button>
      {directory ? null : (
        <p className={styles.notice}>
          {messages.releases.preparation.needsFolder}
        </p>
      )}

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      {actionError ? (
        <ErrorState message={messages.releases.errors[actionError]} />
      ) : null}
      {status === 'loading' ? (
        <LoadingState message={messages.releases.loading} />
      ) : null}
      {status === 'error' && errorCode ? (
        <ErrorState
          message={messages.releases.errors[errorCode]}
          onRetry={reload}
        />
      ) : null}
      {status === 'ready' && releases.length === 0 ? (
        <EmptyState
          title={messages.releases.emptyTitle}
          description={messages.releases.emptyDescription}
        />
      ) : null}
      {status === 'ready' && releases.length > 0 ? (
        <ul className={styles.list}>
          {releases.map((release) => (
            <li key={release.id} className={styles.item}>
              <div className={styles.row}>
                <h2 className={styles.version}>
                  {messages.releases.summary(
                    release.version,
                    release.buildNumber,
                  )}
                </h2>
                <Badge tone={statusTone[release.status]}>
                  {messages.releases.statuses[release.status]}
                </Badge>
              </div>
              <p className={styles.meta}>
                {formatReleaseDate(release.date, language)}
                {' · '}
                {messages.releases.platforms[release.platform]}
              </p>
              {release.changes ? (
                <p className={styles.changes}>{release.changes}</p>
              ) : null}
              {release.notes ? (
                <p className={styles.notes}>
                  <span className={styles.notesLabel}>
                    {messages.releases.notes}
                  </span>
                  {release.notes}
                </p>
              ) : null}
              <div className={styles.actions}>
                {directory ? (
                  <Button
                    variant="secondary"
                    disabled={prepareRunning}
                    onClick={() => setConfirmingPrepare(release)}
                  >
                    {prepareRunning && preparing?.id === release.id
                      ? messages.releases.preparation.preparing
                      : messages.releases.preparation.prepare}
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setNotice(null)
                    setActionError(null)
                    setEditor(release)
                  }}
                >
                  {messages.releases.edit}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setPendingDelete(release)}
                >
                  {messages.releases.delete}
                </Button>
              </div>
              {preparing?.id === release.id ? (
                <ReleasePreparation
                  steps={prepareSteps}
                  running={prepareRunning}
                  errorCode={prepareError}
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <Modal
        open={editor !== null}
        title={
          editor === 'new'
            ? messages.releases.create
            : messages.releases.editTitle
        }
        onClose={() => setEditor(null)}
      >
        {editor ? (
          <ReleaseEditor
            key={editor === 'new' ? 'new' : editor.id}
            applicationId={applicationId}
            release={editor === 'new' ? null : editor}
            onCancel={() => setEditor(null)}
            onSaved={() => {
              setEditor(null)
              setNotice(messages.releases.saved)
              reload()
            }}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmingPrepare !== null}
        title={messages.releases.preparation.confirmTitle}
        description={messages.releases.preparation.confirmDescription(
          confirmingPrepare?.version ?? '',
        )}
        confirmLabel={messages.releases.preparation.confirm}
        cancelLabel={messages.common.cancel}
        tone="primary"
        onConfirm={() => void handlePrepare()}
        onCancel={() => setConfirmingPrepare(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={messages.releases.deleteTitle}
        description={messages.releases.deleteDescription(
          pendingDelete?.version ?? '',
        )}
        confirmLabel={
          deleting ? messages.releases.deleting : messages.releases.delete
        }
        cancelLabel={messages.common.cancel}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deleting) {
            setPendingDelete(null)
          }
        }}
      />
    </section>
  )
}

function ReleaseEditor({
  applicationId,
  release,
  onCancel,
  onSaved,
}: {
  applicationId: string
  release: Release | null
  onCancel: () => void
  onSaved: () => void
}): ReactElement {
  const { messages } = useLanguage()
  const [version, setVersion] = useState(release?.version ?? '')
  const [buildNumber, setBuildNumber] = useState(
    release ? String(release.buildNumber) : '',
  )
  const [date, setDate] = useState(release?.date ?? todayDateInput())
  const [platform, setPlatform] = useState<ReleasePlatform>(
    release?.platform ?? 'both',
  )
  const [status, setStatus] = useState<ReleaseStatus>(
    release?.status ?? 'draft',
  )
  const [changes, setChanges] = useState(release?.changes ?? '')
  const [notes, setNotes] = useState(release?.notes ?? '')
  const [field, setField] = useState<ReleaseFieldError | null>(null)
  const [formError, setFormError] = useState<ReleaseErrorCode | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(): Promise<void> {
    const draft = releaseInputFromFields({
      version,
      buildNumber,
      date,
      platform,
      status,
      changes,
      notes,
    })
    if (!draft.ok) {
      setFormError(draft.field === 'invalid' ? 'invalid' : null)
      setField(draft.field === 'invalid' ? null : draft.field)
      return
    }

    setField(null)
    setFormError(null)
    setSaving(true)
    const fields = {
      version,
      buildNumber,
      date,
      platform,
      status,
      changes,
      notes,
    }
    try {
      if (release) {
        await updateRelease(applicationId, release.id, fields)
      } else {
        await createRelease(applicationId, fields)
      }
      onSaved()
    } catch (error: unknown) {
      setFormError(releaseErrorCode(error, 'save'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit()
      }}
    >
      <Input
        label={messages.releases.version}
        value={version}
        maxLength={40}
        error={
          field === 'version'
            ? messages.releases.fieldErrors.version
            : undefined
        }
        onChange={(event) => setVersion(event.target.value)}
      />
      <Input
        label={messages.releases.build}
        value={buildNumber}
        inputMode="numeric"
        maxLength={9}
        error={
          field === 'build' ? messages.releases.fieldErrors.build : undefined
        }
        onChange={(event) => setBuildNumber(event.target.value)}
      />
      <Input
        label={messages.releases.date}
        type="date"
        value={date}
        error={
          field === 'date' ? messages.releases.fieldErrors.date : undefined
        }
        onChange={(event) => setDate(event.target.value)}
      />
      <Select
        label={messages.releases.platform}
        value={platform}
        options={releasePlatforms.map((item) => ({
          value: item,
          label: messages.releases.platforms[item],
        }))}
        onChange={(event) => {
          const next = releasePlatforms.find(
            (item) => item === event.target.value,
          )
          if (next) {
            setPlatform(next)
          }
        }}
      />
      <Select
        label={messages.releases.status}
        value={status}
        options={releaseStatuses.map((item) => ({
          value: item,
          label: messages.releases.statuses[item],
        }))}
        onChange={(event) => {
          const next = releaseStatuses.find(
            (item) => item === event.target.value,
          )
          if (next) {
            setStatus(next)
          }
        }}
      />
      <TextArea
        label={messages.releases.changes}
        value={changes}
        rows={4}
        maxLength={4000}
        onChange={(event) => setChanges(event.target.value)}
      />
      <TextArea
        label={messages.releases.notes}
        value={notes}
        rows={3}
        maxLength={4000}
        onChange={(event) => setNotes(event.target.value)}
      />
      {formError ? (
        <ErrorState message={messages.releases.errors[formError]} />
      ) : null}
      <div className={styles.actions}>
        <Button variant="secondary" type="button" onClick={onCancel}>
          {messages.common.cancel}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? messages.releases.saving : messages.releases.save}
        </Button>
      </div>
    </form>
  )
}
