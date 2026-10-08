import { useEffect, useState, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { Checkbox } from '@/components/Checkbox.tsx'
import { ConfirmDialog } from '@/components/ConfirmDialog.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Input } from '@/components/Input.tsx'
import { Select } from '@/components/Select.tsx'
import { OpenFolderButton } from '@/features/flutter/OpenFolderButton.tsx'
import {
  parentDirectory,
  suggestedOrg,
  suggestedProjectName,
} from '@/features/flutter/projectDefaults.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { saveApplicationLocalPath } from '@/services/applicationService.ts'
import {
  createFlutterProject,
  fetchFlutterTemplates,
  pickFlutterDirectory,
  selectedPackages,
  type FlutterFeatureOption,
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
  const [catalogFeatures, setCatalogFeatures] = useState<
    FlutterFeatureOption[]
  >([])
  const [templates, setTemplates] = useState<FlutterTemplateOption[]>([])
  const [templateId, setTemplateId] = useState('')
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [projectName, setProjectName] = useState(() =>
    suggestedProjectName(application.name),
  )
  const [org, setOrg] = useState(() =>
    suggestedOrg(
      application.flutter?.packageName,
      application.flutter?.bundleId,
    ),
  )
  const [directory, setDirectory] = useState('')
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
  const [picking, setPicking] = useState(false)
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
        setCatalogFeatures(next.features)
        setTemplates(next.templates)
        setTemplateId((current) => current || next.templates[0]?.id || '')
        setSelectedFeatures((current) =>
          current.length > 0
            ? current
            : [...(next.templates[0]?.features ?? [])],
        )
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
  const packages = selectedPackages(
    catalogFeatures,
    template?.features ?? [],
    selectedFeatures,
  )
  const destination = directory.trim()
  const canCreate =
    connection === 'online' &&
    !creating &&
    template !== undefined &&
    platforms.length > 0 &&
    projectName.trim() !== '' &&
    org.trim() !== '' &&
    directory.trim() !== ''

  async function handlePickDirectory(): Promise<void> {
    setPicking(true)
    setErrorCode(null)
    const result = await pickFlutterDirectory(
      directory || parentDirectory(application.repository?.localPath),
    )
    setPicking(false)
    if (result.ok) {
      setDirectory(result.directory)
      return
    }
    if (result.code !== 'cancelled') {
      setErrorCode(result.code)
    }
  }

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
      features: selectedFeatures,
      directory: directory.trim(),
      description: application.description,
    })

    setCreating(false)
    setOutput(result.ok ? result.output : (result.output ?? ''))
    if (result.projectPath) {
      setProjectPath(result.projectPath)
    }
    if (!result.ok) {
      setErrorCode(result.code)
    }
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
          onChange={(event) => {
            const id = event.target.value
            const nextTemplate = templates.find((item) => item.id === id)
            setTemplateId(id)
            setSelectedFeatures([...(nextTemplate?.features ?? [])])
          }}
        />
        {template ? (
          <fieldset className={styles.features}>
            <legend className={styles.legend}>
              {messages.flutterProject.pieces}
            </legend>
            {template.features.map((id) => {
              const feature = catalogFeatures.find((item) => item.id === id)
              if (!feature) {
                return null
              }
              return (
                <Checkbox
                  key={id}
                  label={featureLabel(
                    messages.flutterProject.features,
                    feature,
                  )}
                  checked={selectedFeatures.includes(id)}
                  disabled={creating}
                  onChange={(event) => {
                    const checked = event.target.checked
                    setSelectedFeatures((current) =>
                      checked
                        ? [...current, id]
                        : current.filter((item) => item !== id),
                    )
                  }}
                />
              )
            })}
          </fieldset>
        ) : null}
        <p className={styles.hint}>{messages.flutterProject.piecesHint}</p>
        <p className={styles.hint}>
          {packages.length > 0
            ? messages.flutterProject.packages(packages.join(', '))
            : messages.flutterProject.packagesNone}
        </p>
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
        <div className={styles.directory}>
          <p className={styles.legend}>{messages.flutterProject.directory}</p>
          <Button
            variant="secondary"
            disabled={connection !== 'online' || creating || picking}
            onClick={() => void handlePickDirectory()}
          >
            {picking
              ? messages.flutterProject.choosing
              : messages.flutterProject.chooseFolder}
          </Button>
          <p className={directory ? styles.path : styles.hint}>
            {directory
              ? messages.flutterProject.destination(directory)
              : messages.flutterProject.folderPrompt}
          </p>
        </div>
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
          {!errorCode ? (
            <p className={styles.status}>{messages.flutterProject.created}</p>
          ) : null}
          <p className={styles.path}>{projectPath}</p>
          <OpenFolderButton directory={projectPath} />
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
        description={messages.flutterProject.confirmDescription(
          destination,
          packages.join(', '),
        )}
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

function templateLabel(
  labels: { basic: string; firebase: string; commercial: string },
  id: string,
): string {
  if (id === 'basic' || id === 'firebase' || id === 'commercial') {
    return labels[id]
  }
  return id
}

function featureLabel(
  labels: {
    localPersistence: string
    firebase: string
    authentication: string
    firestore: string
    analytics: string
    crashlytics: string
    admob: string
    revenueCat: string
  },
  feature: FlutterFeatureOption,
): string {
  const name =
    feature.id === 'localPersistence' ||
    feature.id === 'firebase' ||
    feature.id === 'authentication' ||
    feature.id === 'firestore' ||
    feature.id === 'analytics' ||
    feature.id === 'crashlytics' ||
    feature.id === 'admob' ||
    feature.id === 'revenueCat'
      ? labels[feature.id]
      : feature.id
  return `${name} · ${feature.packages.join(', ')}`
}
