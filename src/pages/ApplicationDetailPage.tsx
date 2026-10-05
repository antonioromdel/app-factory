import { useState, type ReactElement } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Badge } from '@/components/Badge.tsx'
import { Button } from '@/components/Button.tsx'
import { ConfirmDialog } from '@/components/ConfirmDialog.tsx'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { Tabs } from '@/components/Tabs.tsx'
import {
  platformLabel,
  statusLabel,
  statusTone,
  updatedLabel,
  versionLabel,
} from '@/features/applications/applicationDisplay.ts'
import { useApplication } from '@/hooks/useApplication.ts'
import {
  ApplicationDataError,
  archiveApplication,
  duplicateApplication,
} from '@/services/applicationService.ts'
import {
  firebaseServices,
  type Application,
  type FirebaseService,
} from '@/types/application.ts'
import styles from './ApplicationDetailPage.module.css'

const serviceLabels: Record<FirebaseService, string> = {
  authentication: 'Authentication',
  firestore: 'Firestore',
  storage: 'Storage',
  analytics: 'Analytics',
  crashlytics: 'Crashlytics',
  messaging: 'Messaging',
  functions: 'Functions',
  remoteConfig: 'Remote Config',
}

export function ApplicationDetailPage(): ReactElement {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const { status, application, errorMessage, reload } =
    useApplication(applicationId)
  const [isArchiving, setIsArchiving] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isDuplicating, setIsDuplicating] = useState(false)

  if (status === 'loading') {
    return <LoadingState message="Loading application…" />
  }

  if (status === 'missing') {
    return (
      <EmptyState
        title="Application not found"
        description="It may have been removed."
        action={
          <Link className={styles.back} to="/applications">
            Back to applications
          </Link>
        }
      />
    )
  }

  if (status === 'error' || !application) {
    return (
      <ErrorState
        message={errorMessage ?? 'Could not load the application.'}
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
      const id = await duplicateApplication(application)
      navigate(`/applications/${id}`)
    } catch (error: unknown) {
      setActionError(
        error instanceof ApplicationDataError
          ? error.message
          : 'Could not duplicate the application.',
      )
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
        error instanceof ApplicationDataError
          ? error.message
          : 'Could not archive the application.',
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
              {statusLabel(application.status)}
            </Badge>
          ) : null}
        </h2>
        <div className={styles.actions}>
          <Link
            className={styles.link}
            to={`/applications/${application.id}/edit`}
          >
            Edit
          </Link>
          <Button
            variant="secondary"
            disabled={isDuplicating}
            onClick={() => void handleDuplicate()}
          >
            {isDuplicating ? 'Duplicating…' : 'Duplicate'}
          </Button>
          {application.status !== 'ARCHIVED' ? (
            <Button
              variant="danger"
              disabled={isArchiving}
              onClick={() => setConfirmArchive(true)}
            >
              Archive
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      <Tabs
        label="Application sections"
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: <Overview application={application} />,
          },
          {
            id: 'development',
            label: 'Development',
            content: <Development application={application} />,
          },
          {
            id: 'firebase',
            label: 'Firebase',
            content: <FirebaseSection application={application} />,
          },
          {
            id: 'monetization',
            label: 'Monetization',
            content: <Monetization application={application} />,
          },
          {
            id: 'stores',
            label: 'Stores',
            content: <Stores application={application} />,
          },
          {
            id: 'checklist',
            label: 'Checklist',
            content: (
              <EmptyState
                title="No checklist yet"
                description="Checklist progress for this application is not connected yet."
              />
            ),
          },
          {
            id: 'notes',
            label: 'Notes',
            content: <Notes application={application} />,
          },
          {
            id: 'releases',
            label: 'Releases',
            content: (
              <EmptyState
                title="No releases yet"
                description="Release history is not connected yet."
              />
            ),
          },
          {
            id: 'assets',
            label: 'Assets',
            content: (
              <EmptyState
                title="No assets yet"
                description="Icons and store images are not connected yet."
              />
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={confirmArchive}
        title="Archive application"
        description={`Archive ${application.name}? You can still find it by filtering for Archived.`}
        confirmLabel="Archive"
        cancelLabel="Cancel"
        onConfirm={() => void handleArchive()}
        onCancel={() => setConfirmArchive(false)}
      />
    </div>
  )
}

function Overview({ application }: { application: Application }): ReactElement {
  return (
    <FieldList
      fields={[
        { label: 'Description', value: application.description, wide: true },
        { label: 'Category', value: application.category },
        { label: 'Tags', value: application.tags?.join(', ') },
        { label: 'Platform', value: platformLabel(application) },
        { label: 'Version', value: versionLabel(application) },
        { label: 'Updated', value: updatedLabel(application) },
      ]}
    />
  )
}

function Development({
  application,
}: {
  application: Application
}): ReactElement {
  const flutter = application.flutter
  const repository = application.repository

  return (
    <FieldList
      fields={[
        { label: 'Flutter version', value: flutter?.flutterVersion },
        { label: 'Dart version', value: flutter?.dartVersion },
        { label: 'Package name', value: flutter?.packageName },
        { label: 'Bundle ID', value: flutter?.bundleId },
        { label: 'Minimum Android SDK', value: flutter?.minimumAndroidSdk },
        { label: 'iOS deployment target', value: flutter?.iosDeploymentTarget },
        { label: 'Architecture', value: flutter?.architecture },
        { label: 'State management', value: flutter?.stateManagement },
        { label: 'GitHub URL', value: repository?.githubUrl },
        { label: 'Repository', value: repository?.repositoryName },
        { label: 'Local path', value: repository?.localPath, wide: true },
      ]}
    />
  )
}

function FirebaseSection({
  application,
}: {
  application: Application
}): ReactElement {
  const firebase = application.firebase
  const services = firebaseServices
    .filter((service) => firebase?.enabledServices?.includes(service))
    .map((service) => serviceLabels[service])
    .join(', ')

  return (
    <FieldList
      fields={[
        { label: 'Project ID', value: firebase?.projectId },
        { label: 'Project number', value: firebase?.projectNumber },
        { label: 'Console URL', value: firebase?.consoleUrl, wide: true },
        { label: 'Android app ID', value: firebase?.androidAppId },
        { label: 'iOS app ID', value: firebase?.iosAppId },
        { label: 'Services', value: services || undefined, wide: true },
      ]}
    />
  )
}

function Monetization({
  application,
}: {
  application: Application
}): ReactElement {
  const flags = [
    application.monetization?.admob ? 'AdMob' : undefined,
    application.monetization?.inAppPurchases ? 'In-app purchases' : undefined,
    application.monetization?.subscriptions ? 'Subscriptions' : undefined,
    application.monetization?.revenueCat ? 'RevenueCat' : undefined,
  ]
    .filter((item): item is string => Boolean(item))
    .join(', ')

  return (
    <FieldList
      fields={[
        { label: 'Enabled', value: flags || undefined, wide: true },
        { label: 'AdMob app ID', value: application.admob?.appId },
        { label: 'Banner ID', value: application.admob?.bannerId },
        { label: 'Interstitial ID', value: application.admob?.interstitialId },
        { label: 'Rewarded ID', value: application.admob?.rewardedId },
        { label: 'Native ID', value: application.admob?.nativeId },
      ]}
    />
  )
}

function Stores({ application }: { application: Application }): ReactElement {
  return (
    <FieldList
      fields={[
        {
          label: 'Play Console URL',
          value: application.googlePlay?.consoleUrl,
        },
        { label: 'Play Store URL', value: application.googlePlay?.storeUrl },
        {
          label: 'Play version',
          value: application.googlePlay?.currentVersion,
        },
        { label: 'Play track', value: application.googlePlay?.track },
        {
          label: 'App Store Connect URL',
          value: application.appStore?.appStoreConnectUrl,
        },
        { label: 'App Store URL', value: application.appStore?.storeUrl },
        {
          label: 'App Store version',
          value: application.appStore?.currentVersion,
        },
        { label: 'TestFlight URL', value: application.appStore?.testFlightUrl },
      ]}
    />
  )
}

function Notes({ application }: { application: Application }): ReactElement {
  return (
    <FieldList
      fields={[
        {
          label: 'Technical notes',
          value: application.notes?.technicalNotes,
          wide: true,
        },
        {
          label: 'Known issues',
          value: application.notes?.knownIssues,
          wide: true,
        },
        { label: 'Ideas', value: application.notes?.ideas, wide: true },
      ]}
    />
  )
}

function FieldList({
  fields,
}: {
  fields: Array<{ label: string; value?: string; wide?: boolean }>
}): ReactElement {
  const filled = fields.filter((field) => field.value && field.value !== '—')

  if (filled.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        description="These details can stay empty until you know them."
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
          <dd className={styles.value}>{field.value}</dd>
        </div>
      ))}
    </dl>
  )
}
