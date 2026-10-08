import { useState, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { ConfirmDialog } from '@/components/ConfirmDialog.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { OpenFolderButton } from '@/features/flutter/OpenFolderButton.tsx'
import { parentDirectory } from '@/features/flutter/projectDefaults.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { saveApplicationLocalPath } from '@/services/applicationService.ts'
import {
  inspectFlutterProject,
  type HealthErrorCode,
} from '@/services/localHealthService.ts'
import {
  pickFlutterDirectory,
  type LocalFlutterErrorCode,
} from '@/services/localFlutterService.ts'
import type { Application } from '@/types/application.ts'
import styles from './LinkProject.module.css'

export function LinkProject({
  application,
  onSaved,
}: {
  application: Application
  onSaved: () => void
}): ReactElement {
  const { messages } = useLanguage()
  const linked = application.repository?.localPath?.trim() ?? ''
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState('')
  const [pickerError, setPickerError] = useState<LocalFlutterErrorCode | null>(
    null,
  )
  const [linkError, setLinkError] = useState<HealthErrorCode | null>(null)
  const [saveError, setSaveError] = useState(false)

  async function chooseFolder(): Promise<void> {
    setPicking(true)
    setPickerError(null)
    setLinkError(null)
    setSaveError(false)
    setSaved(false)
    const picked = await pickFlutterDirectory(parentDirectory(linked) || linked)
    setPicking(false)
    if (!picked.ok) {
      if (picked.code !== 'cancelled') {
        setPickerError(picked.code)
      }
      return
    }

    const inspected = await inspectFlutterProject(picked.directory)
    if (!inspected.ok) {
      setLinkError(inspected.code)
      return
    }

    if (linked && linked !== inspected.directory) {
      setPending(inspected.directory)
      return
    }

    await saveFolder(inspected.directory)
  }

  async function saveFolder(directory: string): Promise<void> {
    setSaving(true)
    setSaveError(false)
    try {
      await saveApplicationLocalPath(application.id, directory)
      setPending('')
      setSaved(true)
      onSaved()
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.intro}>
        <h2 className={styles.title}>{messages.projectLink.title}</h2>
        <p className={styles.lead}>{messages.projectLink.lead}</p>
      </div>

      {linked ? <p className={styles.path}>{linked}</p> : null}

      <div className={styles.actions}>
        <Button
          variant={linked ? 'secondary' : 'primary'}
          disabled={picking || saving}
          onClick={() => void chooseFolder()}
        >
          {picking
            ? messages.projectLink.choosing
            : saving
              ? messages.common.saving
              : linked
                ? messages.projectLink.change
                : messages.projectLink.choose}
        </Button>
        {linked ? <OpenFolderButton directory={linked} /> : null}
      </div>

      {saved ? (
        <p className={styles.status} role="status">
          {messages.projectLink.saved}
        </p>
      ) : null}
      {pickerError ? (
        <ErrorState message={messages.flutterProject.errors[pickerError]} />
      ) : null}
      {linkError ? (
        <ErrorState message={messages.projectHealth.errors[linkError]} />
      ) : null}
      {saveError ? (
        <ErrorState message={messages.applicationErrors.save} />
      ) : null}

      <ConfirmDialog
        open={pending !== ''}
        tone="primary"
        title={messages.projectLink.confirmTitle}
        description={messages.projectLink.confirmDescription(pending)}
        confirmLabel={messages.projectLink.change}
        cancelLabel={messages.common.cancel}
        onConfirm={() => void saveFolder(pending)}
        onCancel={() => setPending('')}
      />
    </section>
  )
}
