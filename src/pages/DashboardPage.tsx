import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/Badge.tsx'
import { Card } from '@/components/Card.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import {
  formatReleaseDate,
  upcomingReleases,
} from '@/features/releases/releaseRecord.ts'
import { useApplications } from '@/hooks/useApplications.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { useReleases } from '@/hooks/useReleases.ts'
import {
  useFirebaseConnection,
  type FirebaseConnectionState,
} from '@/hooks/useFirebaseConnection.ts'
import type { Messages } from '@/i18n/en.ts'
import type { Application } from '@/types/application.ts'
import styles from './DashboardPage.module.css'

export function DashboardPage(): ReactElement {
  const { language, messages } = useLanguage()
  const connection = useFirebaseConnection()
  const status = connectionStatus(connection, messages)
  const {
    status: applicationsStatus,
    applications,
    errorCode,
    reload,
  } = useApplications()
  const {
    status: releasesStatus,
    releases,
    errorCode: releasesError,
    reload: reloadReleases,
  } = useReleases()

  const active = applications.filter(
    (application) => application.status !== 'ARCHIVED',
  )

  return (
    <div className={styles.page}>
      <div className={styles.statusRow}>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {applicationsStatus === 'loading' ? (
        <LoadingState message={messages.common.loadingApplications} />
      ) : null}

      {applicationsStatus === 'error' ? (
        <ErrorState
          message={messages.applicationErrors[errorCode ?? 'load-list']}
          onRetry={reload}
        />
      ) : null}

      {applicationsStatus === 'ready' ? (
        <>
          <section
            className={styles.stats}
            aria-label={messages.dashboard.overview}
          >
            <Stat title={messages.dashboard.total} value={active.length} />
            <Stat
              title={messages.dashboard.inDevelopment}
              value={countStatus(active, 'DEVELOPMENT')}
            />
            <Stat
              title={messages.dashboard.published}
              value={countStatus(active, 'PUBLISHED')}
            />
            <Stat
              title={messages.dashboard.pendingPublication}
              value={countStatus(active, 'RELEASE')}
            />
          </section>

          <section
            className={styles.panels}
            aria-label={messages.dashboard.activity}
          >
            <ApplicationList
              title={messages.dashboard.recent}
              applications={recent(active, 'createdAt')}
              empty={messages.dashboard.recentEmpty}
              noStatus={messages.common.noStatus}
              statusLabels={messages.status}
            />
            <ApplicationList
              title={messages.dashboard.modified}
              applications={recent(active, 'updatedAt')}
              empty={messages.dashboard.modifiedEmpty}
              noStatus={messages.common.noStatus}
              statusLabels={messages.status}
            />
            <Card title={messages.dashboard.pendingTasks}>
              <p className={styles.detail}>{messages.dashboard.noTasks}</p>
              <Link className={styles.link} to="/checklists">
                {messages.dashboard.openChecklists}
              </Link>
            </Card>
            <Card title={messages.dashboard.upcomingReleases}>
              {releasesStatus === 'loading' ? (
                <LoadingState message={messages.releases.loading} />
              ) : null}
              {releasesStatus === 'error' && releasesError ? (
                <ErrorState
                  message={messages.releases.errors[releasesError]}
                  onRetry={reloadReleases}
                />
              ) : null}
              {releasesStatus === 'ready' &&
              upcomingReleases(releases).length === 0 ? (
                <p className={styles.detail}>
                  {releases.length === 0
                    ? messages.dashboard.noReleases
                    : messages.dashboard.noUpcoming}
                </p>
              ) : null}
              {releasesStatus === 'ready' &&
              upcomingReleases(releases).length > 0 ? (
                <ul className={styles.list}>
                  {upcomingReleases(releases).map((release) => {
                    const application = applications.find(
                      (item) => item.id === release.applicationId,
                    )
                    return (
                      <li key={`${release.applicationId}-${release.id}`}>
                        <Link
                          className={styles.item}
                          to={`/applications/${release.applicationId}?tab=releases`}
                        >
                          <span>
                            {application?.name ??
                              messages.releases.unknownApplication}{' '}
                            {messages.releases.summary(
                              release.version,
                              release.buildNumber,
                            )}
                          </span>
                          <span className={styles.itemMeta}>
                            {formatReleaseDate(release.date, language)}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
              <Link className={styles.link} to="/releases">
                {messages.dashboard.openReleases}
              </Link>
            </Card>
          </section>
        </>
      ) : null}

      <Card title={messages.dashboard.quickActions}>
        <div className={styles.actions}>
          <Link className={styles.link} to="/applications/new">
            {messages.dashboard.newApplication}
          </Link>
          <Link className={styles.link} to="/applications">
            {messages.dashboard.openApplications}
          </Link>
          <Link className={styles.link} to="/knowledge">
            {messages.dashboard.openKnowledge}
          </Link>
        </div>
        <p className={styles.detail}>{messages.dashboard.unavailableTools}</p>
      </Card>
    </div>
  )
}

function Stat({
  title,
  value,
}: {
  title: string
  value: number
}): ReactElement {
  return (
    <Card title={title}>
      <p className={styles.count}>{value}</p>
    </Card>
  )
}

function ApplicationList({
  title,
  applications,
  empty,
  noStatus,
  statusLabels,
}: {
  title: string
  applications: Application[]
  empty: string
  noStatus: string
  statusLabels: Messages['status']
}): ReactElement {
  return (
    <Card title={title}>
      {applications.length === 0 ? (
        <p className={styles.detail}>{empty}</p>
      ) : (
        <ul className={styles.list}>
          {applications.map((application) => (
            <li key={application.id}>
              <Link
                className={styles.item}
                to={`/applications/${application.id}`}
              >
                <span>{application.name}</span>
                <span className={styles.itemMeta}>
                  {application.status
                    ? statusLabels[application.status]
                    : noStatus}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function countStatus(
  applications: Application[],
  status: NonNullable<Application['status']>,
): number {
  return applications.filter((application) => application.status === status)
    .length
}

function recent(
  applications: Application[],
  field: 'createdAt' | 'updatedAt',
): Application[] {
  return [...applications]
    .sort((left, right) => right[field].toMillis() - left[field].toMillis())
    .slice(0, 5)
}

function connectionStatus(
  connection: FirebaseConnectionState,
  messages: Messages,
): {
  label: string
  tone: 'neutral' | 'success' | 'danger'
} {
  if (connection.status === 'loading') {
    return { label: messages.dashboard.checkingConnection, tone: 'neutral' }
  }

  if (connection.status === 'connected') {
    return {
      label: messages.dashboard.connected(connection.projectId),
      tone: 'success',
    }
  }

  return { label: messages.connectionErrors[connection.code], tone: 'danger' }
}
