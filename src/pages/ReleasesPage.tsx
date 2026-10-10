import { useState, type ReactElement } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/Badge.tsx'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { Select } from '@/components/Select.tsx'
import { formatReleaseDate } from '@/features/releases/releaseRecord.ts'
import { useApplications } from '@/hooks/useApplications.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { useReleases } from '@/hooks/useReleases.ts'
import { releaseStatuses, type ReleaseStatus } from '@/types/release.ts'
import styles from './ReleasesPage.module.css'

const statusTone = {
  draft: 'neutral',
  testing: 'info',
  ready: 'warning',
  released: 'success',
  rejected: 'danger',
} as const

type StatusFilter = 'all' | ReleaseStatus

export function ReleasesPage(): ReactElement {
  const { language, messages } = useLanguage()
  const applications = useApplications()
  const releases = useReleases()
  const [filter, setFilter] = useState<StatusFilter>('all')

  const names = new Map(
    applications.applications.map((application) => [
      application.id,
      application.name,
    ]),
  )
  const visible = releases.releases.filter(
    (release) => filter === 'all' || release.status === filter,
  )
  const loading =
    applications.status === 'loading' || releases.status === 'loading'

  return (
    <div className={styles.page}>
      <p className={styles.lead}>{messages.releases.globalLead}</p>

      {loading ? <LoadingState message={messages.releases.loading} /> : null}

      {applications.status === 'error' && applications.errorCode ? (
        <ErrorState
          message={messages.applicationErrors[applications.errorCode]}
          onRetry={applications.reload}
        />
      ) : null}
      {applications.status !== 'error' &&
      releases.status === 'error' &&
      releases.errorCode ? (
        <ErrorState
          message={messages.releases.errors[releases.errorCode]}
          onRetry={releases.reload}
        />
      ) : null}

      {applications.status === 'ready' &&
      applications.applications.length === 0 ? (
        <EmptyState
          title={messages.releases.noApplicationsTitle}
          description={messages.releases.noApplicationsDescription}
          action={
            <Link className={styles.link} to="/applications/new">
              {messages.applications.create}
            </Link>
          }
        />
      ) : null}

      {applications.status === 'ready' &&
      applications.applications.length > 0 &&
      releases.status === 'ready' ? (
        <>
          <Select
            className={styles.filter}
            label={messages.releases.filter}
            value={filter}
            options={[
              { value: 'all', label: messages.releases.filterAll },
              ...releaseStatuses.map((status) => ({
                value: status,
                label: messages.releases.statuses[status],
              })),
            ]}
            onChange={(event) => {
              const next = event.target.value
              if (next === 'all') {
                setFilter('all')
                return
              }
              const status = releaseStatuses.find((item) => item === next)
              if (status) {
                setFilter(status)
              }
            }}
          />

          {releases.releases.length === 0 ? (
            <EmptyState
              title={messages.releases.emptyTitle}
              description={messages.releases.globalEmptyDescription}
              action={
                <Link className={styles.link} to="/applications">
                  {messages.dashboard.openApplications}
                </Link>
              }
            />
          ) : null}

          {releases.releases.length > 0 && visible.length === 0 ? (
            <p className={styles.lead}>{messages.releases.emptyFilter}</p>
          ) : null}

          {visible.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">{messages.releases.columns.application}</th>
                    <th scope="col">{messages.releases.version}</th>
                    <th scope="col">{messages.releases.build}</th>
                    <th scope="col">{messages.releases.date}</th>
                    <th scope="col">{messages.releases.platform}</th>
                    <th scope="col">{messages.releases.status}</th>
                    <th scope="col">{messages.releases.changes}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((release) => (
                    <tr key={`${release.applicationId}-${release.id}`}>
                      <td>
                        <Link
                          className={styles.link}
                          to={`/applications/${release.applicationId}?tab=releases`}
                        >
                          {names.get(release.applicationId) ??
                            messages.releases.unknownApplication}
                        </Link>
                      </td>
                      <td className={styles.version}>{release.version}</td>
                      <td className={styles.version}>{release.buildNumber}</td>
                      <td>{formatReleaseDate(release.date, language)}</td>
                      <td>{messages.releases.platforms[release.platform]}</td>
                      <td>
                        <Badge tone={statusTone[release.status]}>
                          {messages.releases.statuses[release.status]}
                        </Badge>
                      </td>
                      <td className={styles.excerpt}>
                        {release.changes || messages.releases.noChanges}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
