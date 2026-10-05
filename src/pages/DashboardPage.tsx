import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/Badge.tsx'
import { Card } from '@/components/Card.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { statusLabel } from '@/features/applications/applicationDisplay.ts'
import { useApplications } from '@/hooks/useApplications.ts'
import {
  useFirebaseConnection,
  type FirebaseConnectionState,
} from '@/hooks/useFirebaseConnection.ts'
import type { Application } from '@/types/application.ts'
import styles from './DashboardPage.module.css'

export function DashboardPage(): ReactElement {
  const connection = useFirebaseConnection()
  const status = connectionStatus(connection)
  const {
    status: applicationsStatus,
    applications,
    errorMessage,
    reload,
  } = useApplications()

  const active = applications.filter(
    (application) => application.status !== 'ARCHIVED',
  )

  return (
    <div className={styles.page}>
      <div className={styles.statusRow}>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {applicationsStatus === 'loading' ? (
        <LoadingState message="Loading applications…" />
      ) : null}

      {applicationsStatus === 'error' ? (
        <ErrorState
          message={errorMessage ?? 'Could not load applications.'}
          onRetry={reload}
        />
      ) : null}

      {applicationsStatus === 'ready' ? (
        <>
          <section className={styles.stats} aria-label="Overview">
            <Stat title="Total applications" value={active.length} />
            <Stat
              title="In development"
              value={countStatus(active, 'DEVELOPMENT')}
            />
            <Stat title="Published" value={countStatus(active, 'PUBLISHED')} />
            <Stat
              title="Pending publication"
              value={countStatus(active, 'RELEASE')}
            />
          </section>

          <section className={styles.panels} aria-label="Activity">
            <ApplicationList
              title="Recent projects"
              applications={recent(active, 'createdAt')}
              empty="No applications yet."
            />
            <ApplicationList
              title="Recently modified"
              applications={recent(active, 'updatedAt')}
              empty="Nothing has been updated yet."
            />
            <Card title="Pending tasks">
              <p className={styles.detail}>No tasks yet.</p>
              <Link className={styles.link} to="/checklists">
                Open checklists
              </Link>
            </Card>
            <Card title="Upcoming releases">
              <p className={styles.detail}>No releases yet.</p>
              <Link className={styles.link} to="/releases">
                Open releases
              </Link>
            </Card>
          </section>
        </>
      ) : null}

      <Card title="Quick actions">
        <div className={styles.actions}>
          <Link className={styles.link} to="/applications/new">
            New application
          </Link>
          <Link className={styles.link} to="/applications">
            Open applications
          </Link>
          <Link className={styles.link} to="/knowledge">
            Open knowledge base
          </Link>
        </div>
        <p className={styles.detail}>
          Generate assets and prepare release are not available yet.
        </p>
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
}: {
  title: string
  applications: Application[]
  empty: string
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
                    ? statusLabel(application.status)
                    : 'No status'}
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

function connectionStatus(connection: FirebaseConnectionState): {
  label: string
  tone: 'neutral' | 'success' | 'danger'
} {
  if (connection.status === 'loading') {
    return { label: 'Checking Firebase connection…', tone: 'neutral' }
  }

  if (connection.status === 'connected') {
    return {
      label: `Connected to ${connection.projectId}`,
      tone: 'success',
    }
  }

  return { label: connection.message, tone: 'danger' }
}
