import { useEffect, useState, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { Checkbox } from '@/components/Checkbox.tsx'
import { ConfirmDialog } from '@/components/ConfirmDialog.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Input } from '@/components/Input.tsx'
import { Select } from '@/components/Select.tsx'
import {
  parentDirectory,
  projectDirectory,
  suggestedOrg,
  suggestedProjectName,
} from '@/features/flutter/projectDefaults.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { saveApplicationLocalPath } from '@/services/applicationService.ts'
import {
  createFlutterProject,
  fetchFlutterTemplates,
  type FlutterPlatformName,
  type FlutterTemplateOption,
  type LocalFlutterErrorCode,
} from '@/services/localFlutterService.ts'
import type { Application } from '@/types/application.ts'
import styles from './FlutterProject.module.css'

export function FlutterProject({
  application,
  onSaved,
}: {
  application: Application
  onSaved: () => void
}): ReactElement {
  const { messages } = useLanguage()
  const [connection, setConnection] = useState<
    'checking' | 'online' | 'offline'
  >('checking')
  const [templates, setTemplates] = useState<FlutterTemplateOption[]>([])
  const [templateId, setTemplateId] = useState('')
  const [projectName, setProjectName] = useState(() =>
    suggestedProjectName(application.name),
  )
  const [org, setOrg] = useState(() =>
    suggestedOrg(
      application.flutter?.packageName,
      application.flutter?.bundleId,
    ),
  )
  const [directory, setDirectory] = useState(() =>
    parentDirectory(application.repository?.localPath),
  )
  const [android, setAndroid] = useState(
    () =>
      Boolean(application.flutter?.packageName) ||
      !application.flutter?.bundleId,
  )
  const [ios, setIos] = useState(
    () =>
      Boolean(application.flutter?.bundleId) ||
      !application.flutter?.packageName,
  )
  const [confirming, setConfirming] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorCode, setErrorCode] = useState<LocalFlutterErrorCode | null>(null)
  const [saveError, setSaveError] = useState(false)
  const [output, setOutput] = useState('')
  const [projectPath, setProjectPath] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    fetchFlutterTemplates(controller.signal)
      .then((next) => {
        if (controller.signal.aborted) {
          return
        }
        setTemplates(next)
        setTemplateId((current) => current || next[0]?.id || '')
        setConnection('online')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        if (!controller.signal.aborted) {
          setConnection('offline')
        }
      })

    return () => controller.abort()
  }, [])

  const template = templates.find((item) => item.id === templateId)
  const platforms = selectedPlatforms(template, android, ios)
  const destination = projectDirectory(directory, projectName)
  const canCreate =
    connection === 'online' &&
    !creating &&
    template !== undefined &&
    platforms.length > 0 &&
    projectName.trim() !== '' &&
    org.trim() !== '' &&
    directory.trim() !== ''

  async function handleCreate(): Promise<void> {
    if (!template) {
      return
    }

    setConfirming(false)
    setCreating(true)
    setErrorCode(null)
    setSaveError(false)
    setSaved(false)
    setOutput('')
    setProjectPath('')

    const result = await createFlutterProject({
      templateId: template.id,
      projectName: projectName.trim(),
      org: org.trim(),
      platforms,
      directory: directory.trim(),
      description: application.description,
    })

    setCreating(false)
    setOutput(result.ok ? result.output : (result.output ?? ''))
    if (result.ok) {
      setProjectPath(result.projectPath)
      return
    }
    setErrorCode(result.code)
  }

  async function handleSavePath(): Promise<void> {
    if (!projectPath) {
      return
    }

    setSaving(true)
    setSaveError(false)
    try {
      await saveApplicationLocalPath(application.id, projectPath)
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
        <h2 className={styles.title}>{messages.flutterProject.title}</h2>
        <p className={styles.lead}>{messages.flutterProject.lead}</p>
      </div>

      {connection === 'checking' ? (
        <p className={styles.status}>{messages.flutterProject.checking}</p>
      ) : null}
      {connection === 'offline' ? (
        <ErrorState message={messages.flutterProject.errors.offline} />
      ) : null}

      <div className={styles.form}>
        <Select
          label={messages.flutterProject.template}
          value={templateId}
          disabled={
            connection !== 'online' || creating || templates.length === 0
          }
          options={templates.map((item) => ({
            value: item.id,
            label: templateLabel(messages.flutterProject.templates, item.id),
          }))}
          onChange={(event) => setTemplateId(event.target.value)}
        />
        <Input
          label={messages.flutterProject.projectName}
          value={projectName}
          disabled={creating}
          onChange={(event) => setProjectName(event.target.value)}
        />
        <Input
          label={messages.flutterProject.org}
          value={org}
          disabled={creating}
          onChange={(event) => setOrg(event.target.value)}
        />
        <Input
          label={messages.flutterProject.directory}
          value={directory}
          disabled={creating}
          spellCheck={false}
          onChange={(event) => setDirectory(event.target.value)}
        />
        <p className={styles.hint}>{messages.flutterProject.directoryHint}</p>
        <div className={styles.platforms}>
          {template?.platforms.includes('android') ? (
            <Checkbox
              label={messages.flutterProject.android}
              checked={android}
              disabled={creating}
              onChange={(event) => setAndroid(event.target.checked)}
            />
          ) : null}
          {template?.platforms.includes('ios') ? (
            <Checkbox
              label={messages.flutterProject.ios}
              checked={ios}
              disabled={creating}
              onChange={(event) => setIos(event.target.checked)}
            />
          ) : null}
        </div>
        <p className={styles.hint}>
          {messages.flutterProject.destination(destination)}
        </p>
        <Button disabled={!canCreate} onClick={() => setConfirming(true)}>
          {creating
            ? messages.flutterProject.creating
            : messages.flutterProject.create}
        </Button>
      </div>

      {errorCode ? (
        <ErrorState message={messages.flutterProject.errors[errorCode]} />
      ) : null}

      {projectPath ? (
        <div className={styles.success}>
          <p className={styles.status}>{messages.flutterProject.created}</p>
          <p className={styles.path}>{projectPath}</p>
          <Button disabled={saving} onClick={() => void handleSavePath()}>
            {saving ? messages.common.saving : messages.flutterProject.savePath}
          </Button>
          {saved ? (
            <p className={styles.status} role="status">
              {messages.flutterProject.saved}
            </p>
          ) : null}
          {saveError ? (
            <ErrorState message={messages.applicationErrors.save} />
          ) : null}
        </div>
      ) : null}

      {output ? (
        <div className={styles.output}>
          <h3 className={styles.outputTitle}>
            {messages.flutterProject.output}
          </h3>
          <pre className={styles.terminal}>{output}</pre>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        tone="primary"
        title={messages.flutterProject.confirmTitle}
        description={messages.flutterProject.confirmDescription(destination)}
        confirmLabel={messages.flutterProject.create}
        cancelLabel={messages.common.cancel}
        onConfirm={() => void handleCreate()}
        onCancel={() => setConfirming(false)}
      />
    </section>
  )
}

function selectedPlatforms(
  template: FlutterTemplateOption | undefined,
  android: boolean,
  ios: boolean,
): FlutterPlatformName[] {
  if (!template) {
    return []
  }

  return template.platforms.filter((platform) =>
    platform === 'android' ? android : ios,
  )
}

function templateLabel(labels: { app: string }, id: string): string {
  if (id === 'app') {
    return labels.app
  }
  return id
}
