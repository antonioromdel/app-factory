import { useRef, useState, type ReactElement } from 'react'
import { ExternalLink } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Badge } from '@/components/Badge.tsx'
import { Button } from '@/components/Button.tsx'
import { ConfirmDialog } from '@/components/ConfirmDialog.tsx'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { Tabs } from '@/components/Tabs.tsx'
import {
  platformLabel,
  statusTone,
  updatedLabel,
  versionLabel,
} from '@/features/applications/applicationDisplay.ts'
import { ApplicationStatusSelect } from '@/features/applications/ApplicationStatusSelect.tsx'
import { ApplicationAssets } from '@/features/assets/ApplicationAssets.tsx'
import { ApplicationChecklist } from '@/features/checklists/ApplicationChecklist.tsx'
import { FlutterProject } from '@/features/flutter/FlutterProject.tsx'
import { useApplication } from '@/hooks/useApplication.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  applicationErrorCode,
  archiveApplication,
  duplicateApplication,
} from '@/services/applicationService.ts'
import {
  checklistErrorCode,
  copyProjectChecklist,
} from '@/services/checklistService.ts'
import { firebaseServices, type Application } from '@/types/application.ts'
import styles from './ApplicationDetailPage.module.css'

const detailTabIds = [
  'overview',
  'development',
  'firebase',
  'monetization',
  'stores',
  'checklist',
  'notes',
  'releases',
  'assets',
] as const

type DetailTabId = (typeof detailTabIds)[number]

function detailTabFromQuery(value: string | null): DetailTabId {
  const match = detailTabIds.find((tab) => tab === value)
  return match ?? 'overview'
}

export function ApplicationDetailPage(): ReactElement {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const { language, messages } = useLanguage()
  const [searchParams] = useSearchParams()
  const tab = detailTabFromQuery(searchParams.get('tab'))
  const { status, application, errorCode, reload } =
    useApplication(applicationId)
  const [isArchiving, setIsArchiving] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const copiedId = useRef<string | null>(null)

  if (status === 'loading') {
    return <LoadingState message={messages.common.loadingApplication} />
  }

  if (status === 'missing') {
    return (
      <EmptyState
        title={messages.common.applicationNotFound}
        description={messages.detail.removed}
        action={
          <Link className={styles.back} to="/applications">
            {messages.common.backToApplications}
          </Link>
        }
      />
    )
  }

  if (status === 'error' || !application) {
    return (
      <ErrorState
        message={messages.applicationErrors[errorCode ?? 'load-one']}
        onRetry={reload}
      />
    )
  }

  async function handleDuplicate(): Promise<void> {
    if (!application) {
      return
    }

    setActionError(null)
    setIsDuplicating(true)

    try {
      const id =
        copiedId.current ??
        (await duplicateApplication(
          application,
          messages.applications.copyOf(application.name),
        ))
      copiedId.current = id
      await copyProjectChecklist(application.id, id)
      navigate(`/applications/${id}`)
    } catch (error: unknown) {
      if (copiedId.current) {
        setActionError(
          messages.checklist.errors[checklistErrorCode(error, 'copy')],
        )
      } else {
        const code = applicationErrorCode(error, 'create')
        setActionError(
          code === 'create'
            ? messages.applications.duplicateFailed
            : messages.applicationErrors[code],
        )
      }
      setIsDuplicating(false)
    }
  }

  async function handleArchive(): Promise<void> {
    if (!application) {
      return
    }

    setActionError(null)
    setIsArchiving(true)

    try {
      await archiveApplication(application.id)
      navigate('/applications')
    } catch (error: unknown) {
      setActionError(
        messages.applicationErrors[applicationErrorCode(error, 'archive')],
      )
      setIsArchiving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {application.name}
          {application.status ? (
            <Badge tone={statusTone(application.status)}>
              {messages.status[application.status]}
            </Badge>
          ) : null}
        </h2>
        <div className={styles.actions}>
          <ApplicationStatusSelect
            className={styles.status}
            applicationId={application.id}
            status={application.status}
            onArchive={() => setConfirmArchive(true)}
            onChanged={reload}
            onError={setActionError}
          />
          <Link
            className={styles.link}
            to={`/applications/${application.id}/edit`}
          >
            {messages.detail.edit}
          </Link>
          <Button
            variant="secondary"
            disabled={isDuplicating}
            onClick={() => void handleDuplicate()}
          >
            {isDuplicating
              ? messages.detail.duplicating
              : messages.detail.duplicate}
          </Button>
          {application.status !== 'ARCHIVED' ? (
            <Button
              variant="danger"
              disabled={isArchiving}
              onClick={() => setConfirmArchive(true)}
            >
              {messages.detail.archive}
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      <Tabs
        key={tab}
        label={messages.detail.sections}
        initialId={tab}
        tabs={[
          {
            id: 'overview',
            label: messages.fields.overview,
            content: <Overview application={application} locale={language} />,
          },
          {
            id: 'development',
            label: messages.fields.development,
            content: (
              <Development application={application} onReload={reload} />
            ),
          },
          {
            id: 'firebase',
            label: messages.fields.firebase,
            content: <FirebaseSection application={application} />,
          },
          {
            id: 'monetization',
            label: messages.fields.monetization,
            content: <Monetization application={application} />,
          },
          {
            id: 'stores',
            label: messages.fields.stores,
            content: <Stores application={application} />,
          },
          {
            id: 'checklist',
            label: messages.fields.checklist,
            content: <ApplicationChecklist applicationId={application.id} />,
          },
          {
            id: 'notes',
            label: messages.fields.notes,
            content: <Notes application={application} />,
          },
          {
            id: 'releases',
            label: messages.fields.releases,
            content: (
              <EmptyState
                title={messages.detail.releasesTitle}
                description={messages.detail.releasesDescription}
              />
            ),
          },
          {
            id: 'assets',
            label: messages.fields.assets,
            content: <ApplicationAssets applicationId={application.id} />,
          },
        ]}
      />

      <ConfirmDialog
        open={confirmArchive}
        title={messages.applications.archiveTitle}
        description={messages.applications.archiveDescription(application.name)}
        confirmLabel={messages.applications.archive}
        cancelLabel={messages.common.cancel}
        onConfirm={() => void handleArchive()}
        onCancel={() => setConfirmArchive(false)}
      />
    </div>
  )
}

function Overview({
  application,
  locale,
}: {
  application: Application
  locale: string
}): ReactElement {
  const { messages } = useLanguage()

  return (
    <FieldList
      fields={[
        {
          label: messages.common.description,
          value: application.description,
          wide: true,
        },
        { label: messages.common.category, value: application.category },
        { label: messages.common.tags, value: application.tags?.join(', ') },
        { label: messages.fields.platform, value: platformLabel(application) },
        { label: messages.fields.version, value: versionLabel(application) },
        {
          label: messages.fields.updated,
          value: updatedLabel(application, locale),
        },
      ]}
    />
  )
}

function Development({
  application,
  onReload,
}: {
  application: Application
  onReload: () => void
}): ReactElement {
  const { messages } = useLanguage()
  const flutter = application.flutter
  const repository = application.repository

  return (
    <>
      <FieldList
        fields={[
          {
            label: messages.fields.flutterVersion,
            value: flutter?.flutterVersion,
          },
          { label: messages.fields.dartVersion, value: flutter?.dartVersion },
          { label: messages.fields.packageName, value: flutter?.packageName },
          { label: messages.fields.bundleId, value: flutter?.bundleId },
          {
            label: messages.fields.minimumAndroidSdk,
            value: flutter?.minimumAndroidSdk,
          },
          {
            label: messages.fields.iosDeploymentTarget,
            value: flutter?.iosDeploymentTarget,
          },
          { label: messages.fields.architecture, value: flutter?.architecture },
          {
            label: messages.fields.stateManagement,
            value: flutter?.stateManagement,
          },
          {
            label: messages.fields.githubUrl,
            value: repository?.githubUrl,
            link: true,
          },
          {
            label: messages.fields.repository,
            value: repository?.repositoryName,
          },
          {
            label: messages.fields.localPath,
            value: repository?.localPath,
            wide: true,
          },
        ]}
      />
      <FlutterProject application={application} onSaved={onReload} />
    </>
  )
}

function FirebaseSection({
  application,
}: {
  application: Application
}): ReactElement {
  const { messages } = useLanguage()
  const firebase = application.firebase
  const services = firebaseServices
    .filter((service) => firebase?.enabledServices?.includes(service))
    .map((service) => messages.services[service])
    .join(', ')

  return (
    <FieldList
      fields={[
        { label: messages.fields.projectId, value: firebase?.projectId },
        {
          label: messages.fields.projectNumber,
          value: firebase?.projectNumber,
        },
        {
          label: messages.fields.consoleUrl,
          value: firebase?.consoleUrl,
          link: true,
          wide: true,
        },
        { label: messages.fields.androidAppId, value: firebase?.androidAppId },
        { label: messages.fields.iosAppId, value: firebase?.iosAppId },
        {
          label: messages.fields.services,
          value: services || undefined,
          wide: true,
        },
      ]}
    />
  )
}

function Monetization({
  application,
}: {
  application: Application
}): ReactElement {
  const { messages } = useLanguage()
  const flags = [
    application.monetization?.admob ? messages.fields.admob : undefined,
    application.monetization?.inAppPurchases
      ? messages.fields.inAppPurchases
      : undefined,
    application.monetization?.subscriptions
      ? messages.fields.subscriptions
      : undefined,
    application.monetization?.revenueCat
      ? messages.fields.revenueCat
      : undefined,
  ]
    .filter((item): item is string => Boolean(item))
    .join(', ')

  return (
    <FieldList
      fields={[
        {
          label: messages.fields.enabled,
          value: flags || undefined,
          wide: true,
        },
        {
          label: messages.fields.admobConsoleUrl,
          value: application.admob?.consoleUrl,
          link: true,
          wide: true,
        },
        { label: messages.fields.admobAppId, value: application.admob?.appId },
        { label: messages.fields.bannerId, value: application.admob?.bannerId },
        {
          label: messages.fields.interstitialId,
          value: application.admob?.interstitialId,
        },
        {
          label: messages.fields.rewardedId,
          value: application.admob?.rewardedId,
        },
        { label: messages.fields.nativeId, value: application.admob?.nativeId },
        {
          label: messages.fields.revenueCatUrl,
          value: application.revenueCat?.dashboardUrl,
          link: true,
          wide: true,
        },
      ]}
    />
  )
}

function Stores({ application }: { application: Application }): ReactElement {
  const { messages } = useLanguage()

  return (
    <FieldList
      fields={[
        {
          label: messages.fields.playConsoleUrl,
          value: application.googlePlay?.consoleUrl,
          link: true,
        },
        {
          label: messages.fields.playStoreUrl,
          value: application.googlePlay?.storeUrl,
          link: true,
        },
        {
          label: messages.fields.playVersion,
          value: application.googlePlay?.currentVersion,
        },
        {
          label: messages.fields.playTrack,
          value: application.googlePlay?.track,
        },
        {
          label: messages.fields.appStoreConnectUrl,
          value: application.appStore?.appStoreConnectUrl,
          link: true,
        },
        {
          label: messages.fields.appStoreUrl,
          value: application.appStore?.storeUrl,
          link: true,
        },
        {
          label: messages.fields.appStoreVersion,
          value: application.appStore?.currentVersion,
        },
        {
          label: messages.fields.testFlightUrl,
          value: application.appStore?.testFlightUrl,
          link: true,
        },
      ]}
    />
  )
}

function Notes({ application }: { application: Application }): ReactElement {
  const { messages } = useLanguage()

  return (
    <FieldList
      fields={[
        {
          label: messages.fields.technicalNotes,
          value: application.notes?.technicalNotes,
          wide: true,
        },
        {
          label: messages.fields.knownIssues,
          value: application.notes?.knownIssues,
          wide: true,
        },
        {
          label: messages.fields.ideas,
          value: application.notes?.ideas,
          wide: true,
        },
      ]}
    />
  )
}

function FieldList({
  fields,
}: {
  fields: Array<{
    label: string
    value?: string
    wide?: boolean
    link?: boolean
  }>
}): ReactElement {
  const { messages } = useLanguage()
  const filled = fields.filter(
    (
      field,
    ): field is {
      label: string
      value: string
      wide?: boolean
      link?: boolean
    } => Boolean(field.value && field.value !== '—'),
  )

  if (filled.length === 0) {
    return (
      <EmptyState
        title={messages.detail.emptyTitle}
        description={messages.detail.emptyDescription}
      />
    )
  }

  return (
    <dl className={styles.fields}>
      {filled.map((field) => (
        <div
          key={field.label}
          className={
            field.wide ? `${styles.field} ${styles.wide}` : styles.field
          }
        >
          <dt className={styles.label}>{field.label}</dt>
          <dd className={styles.value}>
            <FieldValue value={field.value} link={field.link} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function FieldValue({
  value,
  link,
}: {
  value: string
  link?: boolean
}): ReactElement {
  const { messages } = useLanguage()
  const href = link ? externalHref(value) : null

  if (!href) {
    return <>{value}</>
  }

  return (
    <a
      className={styles.external}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {value}
      <ExternalLink
        className={styles.externalIcon}
        aria-hidden="true"
        size={16}
      />
      <span className={styles.srOnly}>{messages.detail.opensInNewTab}</span>
    </a>
  )
}

function externalHref(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || /\s/.test(trimmed)) {
    return null
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') {
      return null
    }
    return url.href
  } catch {
    return null
  }
}
