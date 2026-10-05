import { useState, type ReactElement } from 'react'
import { Smartphone } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/Badge.tsx'
import { ConfirmDialog } from '@/components/ConfirmDialog.tsx'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Input } from '@/components/Input.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { Select } from '@/components/Select.tsx'
import {
  platformLabel,
  statusLabel,
  statusRank,
  statusTone,
  updatedLabel,
  versionLabel,
} from '@/features/applications/applicationDisplay.ts'
import { useApplications } from '@/hooks/useApplications.ts'
import {
  ApplicationDataError,
  archiveApplication,
  duplicateApplication,
} from '@/services/applicationService.ts'
import {
  applicationStatuses,
  type Application,
  type ApplicationStatus,
} from '@/types/application.ts'
import styles from './ApplicationsPage.module.css'

type StatusFilter = 'active' | 'all' | ApplicationStatus
type ApplicationSort = 'updated' | 'name' | 'status'

export function ApplicationsPage(): ReactElement {
  const { status, applications, errorMessage, reload } = useApplications()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [sort, setSort] = useState<ApplicationSort>('updated')
  const [pendingArchive, setPendingArchive] = useState<Application | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  if (status === 'loading') {
    return <LoadingState message="Loading applications…" />
  }

  if (status === 'error') {
    return (
      <ErrorState
        message={errorMessage ?? 'Could not load applications.'}
        onRetry={reload}
      />
    )
  }

  const visible = filterApplications(applications, query, statusFilter).sort(
    (left, right) => compareApplications(left, right, sort),
  )

  async function handleDuplicate(application: Application): Promise<void> {
    setActionError(null)
    setBusyId(application.id)

    try {
      await duplicateApplication(application)
      reload()
    } catch (error: unknown) {
      setActionError(
        error instanceof ApplicationDataError
          ? error.message
          : 'Could not duplicate the application.',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleArchive(): Promise<void> {
    if (!pendingArchive) {
      return
    }

    setActionError(null)
    setBusyId(pendingArchive.id)

    try {
      await archiveApplication(pendingArchive.id)
      setPendingArchive(null)
      reload()
    } catch (error: unknown) {
      setActionError(
        error instanceof ApplicationDataError
          ? error.message
          : 'Could not archive the application.',
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Input
          className={styles.search}
          label="Search"
          hideLabel
          type="search"
          placeholder="Search applications"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          className={styles.filter}
          label="Status"
          value={statusFilter}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'all', label: 'All' },
            ...applicationStatuses.map((item) => ({
              value: item,
              label: statusLabel(item),
            })),
          ]}
          onChange={(event) => {
            setStatusFilter(event.target.value as StatusFilter)
          }}
        />
        <Select
          className={styles.filter}
          label="Sort"
          value={sort}
          options={[
            { value: 'updated', label: 'Last update' },
            { value: 'name', label: 'Name' },
            { value: 'status', label: 'Status' },
          ]}
          onChange={(event) => {
            setSort(event.target.value as ApplicationSort)
          }}
        />
        <Link className={styles.create} to="/applications/new">
          New application
        </Link>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Create your first application. Only the name is required."
          action={
            <Link className={styles.create} to="/applications/new">
              Create application
            </Link>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No matching applications"
          description="Try another search or status."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Application</th>
                <th>Status</th>
                <th>Version</th>
                <th>Platform</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((application) => (
                <tr key={application.id}>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.icon}>
                        <Smartphone
                          size={22}
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </span>
                      <Link
                        className={styles.name}
                        to={`/applications/${application.id}`}
                      >
                        {application.name}
                      </Link>
                    </div>
                  </td>
                  <td>
                    {application.status ? (
                      <Badge tone={statusTone(application.status)}>
                        {statusLabel(application.status)}
                      </Badge>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td className={styles.muted}>{versionLabel(application)}</td>
                  <td className={styles.muted}>{platformLabel(application)}</td>
                  <td className={styles.muted}>{updatedLabel(application)}</td>
                  <td>
                    <div className={styles.actions}>
                      <Link
                        className={styles.action}
                        to={`/applications/${application.id}`}
                      >
                        View
                      </Link>
                      <Link
                        className={styles.action}
                        to={`/applications/${application.id}/edit`}
                      >
                        Edit
                      </Link>
                      <button
                        className={styles.action}
                        type="button"
                        disabled={busyId === application.id}
                        onClick={() => void handleDuplicate(application)}
                      >
                        Duplicate
                      </button>
                      {application.status !== 'ARCHIVED' ? (
                        <button
                          className={styles.action}
                          type="button"
                          disabled={busyId === application.id}
                          onClick={() => setPendingArchive(application)}
                        >
                          Archive
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pendingArchive !== null}
        title="Archive application"
        description={
          pendingArchive
            ? `Archive ${pendingArchive.name}? You can still find it by filtering for Archived.`
            : ''
        }
        confirmLabel="Archive"
        cancelLabel="Cancel"
        onConfirm={() => void handleArchive()}
        onCancel={() => setPendingArchive(null)}
      />
    </div>
  )
}

function filterApplications(
  applications: Application[],
  query: string,
  statusFilter: StatusFilter,
): Application[] {
  const needle = query.trim().toLowerCase()

  return applications.filter((application) => {
    if (statusFilter === 'active' && application.status === 'ARCHIVED') {
      return false
    }

    if (
      statusFilter !== 'active' &&
      statusFilter !== 'all' &&
      application.status !== statusFilter
    ) {
      return false
    }

    if (!needle) {
      return true
    }

    return searchText(application).includes(needle)
  })
}

function searchText(application: Application): string {
  return [
    application.name,
    application.description,
    application.category,
    application.tags?.join(' '),
    application.flutter?.packageName,
    application.flutter?.bundleId,
    application.repository?.repositoryName,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()
}

function compareApplications(
  left: Application,
  right: Application,
  sort: ApplicationSort,
): number {
  if (sort === 'name') {
    return left.name.localeCompare(right.name)
  }

  if (sort === 'status') {
    return (
      statusRank(left.status) - statusRank(right.status) ||
      left.name.localeCompare(right.name)
    )
  }

  return right.updatedAt.toMillis() - left.updatedAt.toMillis()
}
