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
  statusRank,
  statusTone,
  updatedLabel,
  versionLabel,
} from '@/features/applications/applicationDisplay.ts'
import { useApplications } from '@/hooks/useApplications.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  applicationErrorCode,
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
  const { language, messages } = useLanguage()
  const { status, applications, errorCode, reload } = useApplications()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [sort, setSort] = useState<ApplicationSort>('updated')
  const [pendingArchive, setPendingArchive] = useState<Application | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  if (status === 'loading') {
    return <LoadingState message={messages.common.loadingApplications} />
  }

  if (status === 'error') {
    return (
      <ErrorState
        message={messages.applicationErrors[errorCode ?? 'load-list']}
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
      await duplicateApplication(
        application,
        messages.applications.copyOf(application.name),
      )
      reload()
    } catch (error: unknown) {
      const code = applicationErrorCode(error, 'create')
      setActionError(
        code === 'create'
          ? messages.applications.duplicateFailed
          : messages.applicationErrors[code],
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
        messages.applicationErrors[applicationErrorCode(error, 'archive')],
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
          label={messages.applications.search}
          hideLabel
          type="search"
          placeholder={messages.applications.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          className={styles.filter}
          label={messages.applications.status}
          value={statusFilter}
          options={[
            { value: 'active', label: messages.applications.active },
            { value: 'all', label: messages.applications.all },
            ...applicationStatuses.map((item) => ({
              value: item,
              label: messages.status[item],
            })),
          ]}
          onChange={(event) => {
            setStatusFilter(event.target.value as StatusFilter)
          }}
        />
        <Select
          className={styles.filter}
          label={messages.applications.sort}
          value={sort}
          options={[
            { value: 'updated', label: messages.applications.sortUpdated },
            { value: 'name', label: messages.applications.sortName },
            { value: 'status', label: messages.applications.sortStatus },
          ]}
          onChange={(event) => {
            setSort(event.target.value as ApplicationSort)
          }}
        />
        <Link className={styles.create} to="/applications/new">
          {messages.applications.newApplication}
        </Link>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {applications.length === 0 ? (
        <EmptyState
          title={messages.applications.emptyTitle}
          description={messages.applications.emptyDescription}
          action={
            <Link className={styles.create} to="/applications/new">
              {messages.applications.create}
            </Link>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title={messages.applications.noMatchesTitle}
          description={messages.applications.noMatchesDescription}
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{messages.applications.columnApplication}</th>
                <th>{messages.applications.columnStatus}</th>
                <th>{messages.applications.columnVersion}</th>
                <th>{messages.applications.columnPlatform}</th>
                <th>{messages.applications.columnUpdated}</th>
                <th>{messages.applications.columnActions}</th>
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
                        {messages.status[application.status]}
                      </Badge>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td className={styles.muted}>{versionLabel(application)}</td>
                  <td className={styles.muted}>{platformLabel(application)}</td>
                  <td className={styles.muted}>
                    {updatedLabel(application, language)}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link
                        className={styles.action}
                        to={`/applications/${application.id}`}
                      >
                        {messages.applications.view}
                      </Link>
                      <Link
                        className={styles.action}
                        to={`/applications/${application.id}/edit`}
                      >
                        {messages.applications.edit}
                      </Link>
                      <button
                        className={styles.action}
                        type="button"
                        disabled={busyId === application.id}
                        onClick={() => void handleDuplicate(application)}
                      >
                        {messages.applications.duplicate}
                      </button>
                      {application.status !== 'ARCHIVED' ? (
                        <button
                          className={styles.action}
                          type="button"
                          disabled={busyId === application.id}
                          onClick={() => setPendingArchive(application)}
                        >
                          {messages.applications.archive}
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
        title={messages.applications.archiveTitle}
        description={
          pendingArchive
            ? messages.applications.archiveDescription(pendingArchive.name)
            : ''
        }
        confirmLabel={messages.applications.archive}
        cancelLabel={messages.common.cancel}
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
