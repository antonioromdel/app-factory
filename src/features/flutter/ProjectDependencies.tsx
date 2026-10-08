import { useState, type ReactElement } from 'react'
import { Badge } from '@/components/Badge.tsx'
import { Button } from '@/components/Button.tsx'
import { ConfirmDialog } from '@/components/ConfirmDialog.tsx'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { Select } from '@/components/Select.tsx'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  dependencyFilters,
  listProjectDependencies,
  upgradeProjectDependency,
  type DependencyErrorCode,
  type DependencyFilter,
  type ProjectDependency,
} from '@/services/localDependencyService.ts'
import styles from './ProjectDependencies.module.css'

export function ProjectDependencies({
  directory,
}: {
  directory: string
}): ReactElement {
  const { messages } = useLanguage()
  const [packages, setPackages] = useState<ProjectDependency[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorCode, setErrorCode] = useState<DependencyErrorCode | null>(null)
  const [failureOutput, setFailureOutput] = useState('')
  const [filter, setFilter] = useState<DependencyFilter>('managed')
  const [pending, setPending] = useState<ProjectDependency | null>(null)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [updatedName, setUpdatedName] = useState<string | null>(null)

  async function load(): Promise<void> {
    setLoading(true)
    setErrorCode(null)
    setFailureOutput('')
    const result = await listProjectDependencies(directory)
    setLoading(false)
    if (!result.ok) {
      setErrorCode(result.code)
      setFailureOutput(result.output)
      return
    }
    setPackages(result.packages)
  }

  async function confirmUpdate(): Promise<void> {
    if (!pending) {
      return
    }

    const name = pending.name
    setPending(null)
    setUpgrading(name)
    setUpdatedName(null)
    setErrorCode(null)
    setFailureOutput('')
    const result = await upgradeProjectDependency(directory, name)
    setUpgrading(null)
    if (!result.ok) {
      setErrorCode(result.code)
      setFailureOutput(result.output)
      return
    }

    setUpdatedName(name)
    await load()
  }

  const visible = packages?.filter((item) => matchesFilter(item, filter)) ?? []
  const outdatedCount = packages?.filter((item) => item.outdated).length ?? 0

  return (
    <section className={styles.section}>
      <div className={styles.intro}>
        <h2 className={styles.title}>{messages.dependencies.title}</h2>
        <p className={styles.lead}>{messages.dependencies.lead}</p>
      </div>

      <div className={styles.toolbar}>
        <Button
          disabled={loading || upgrading !== null}
          onClick={() => void load()}
        >
          {loading ? messages.dependencies.loading : messages.dependencies.load}
        </Button>
        {packages ? (
          <Select
            className={styles.filter}
            label={messages.dependencies.filter}
            value={filter}
            onChange={(event) => {
              const next = dependencyFilters.find(
                (item) => item === event.target.value,
              )
              if (next) {
                setFilter(next)
              }
            }}
            options={dependencyFilters.map((item) => ({
              value: item,
              label: messages.dependencies.filters[item],
            }))}
          />
        ) : null}
      </div>

      {updatedName ? (
        <p className={styles.success} role="status">
          {messages.dependencies.updated(updatedName)}
        </p>
      ) : null}

      {errorCode ? (
        <ErrorState
          message={messages.dependencies.errors[errorCode]}
          onRetry={() => void load()}
        />
      ) : null}
      {failureOutput ? (
        <pre className={styles.output}>{failureOutput}</pre>
      ) : null}

      {loading ? (
        <LoadingState message={messages.dependencies.loading} />
      ) : null}

      {packages && !loading && packages.length === 0 ? (
        <EmptyState
          title={messages.dependencies.emptyTitle}
          description={messages.dependencies.emptyDescription}
        />
      ) : null}

      {packages && !loading && packages.length > 0 ? (
        <>
          <p className={styles.summary}>
            {messages.dependencies.summary(packages.length, outdatedCount)}
          </p>
          {visible.length === 0 ? (
            <p className={styles.lead}>{messages.dependencies.emptyFilter}</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">{messages.dependencies.columns.package}</th>
                    <th scope="col">{messages.dependencies.columns.current}</th>
                    <th scope="col">{messages.dependencies.columns.latest}</th>
                    <th scope="col">{messages.dependencies.columns.purpose}</th>
                    <th scope="col">{messages.dependencies.columns.status}</th>
                    <th scope="col">{messages.dependencies.columns.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={`${item.kind}-${item.name}`}>
                      <td>
                        <div className={styles.nameCell}>
                          <span className={styles.name}>{item.name}</span>
                          <Badge tone="neutral">
                            {messages.dependencies.kinds[item.kind]}
                          </Badge>
                          {item.discontinued ? (
                            <Badge tone="warning">
                              {messages.dependencies.discontinued}
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className={styles.version}>
                        {item.current ?? messages.dependencies.unknownVersion}
                      </td>
                      <td className={styles.version}>
                        {item.latest ?? messages.dependencies.unknownVersion}
                      </td>
                      <td>
                        <p
                          className={styles.purpose}
                          title={item.purpose || undefined}
                        >
                          {item.purpose || messages.dependencies.unknownPurpose}
                        </p>
                      </td>
                      <td>
                        <Badge
                          tone={
                            item.outdated
                              ? 'warning'
                              : item.current && item.latest
                                ? 'success'
                                : 'neutral'
                          }
                        >
                          {item.outdated
                            ? messages.dependencies.outdated
                            : item.current && item.latest
                              ? messages.dependencies.current
                              : messages.dependencies.unknownStatus}
                        </Badge>
                      </td>
                      <td>
                        {item.updatable ? (
                          <Button
                            variant="secondary"
                            disabled={upgrading !== null}
                            aria-label={messages.dependencies.updateNamed(
                              item.name,
                            )}
                            onClick={() => setPending(item)}
                          >
                            {upgrading === item.name
                              ? messages.dependencies.updating
                              : messages.dependencies.update}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        tone="primary"
        title={
          pending
            ? messages.dependencies.confirmTitle(pending.name)
            : messages.dependencies.update
        }
        description={
          pending
            ? messages.dependencies.confirmDescription(
                pending.name,
                pending.latest ?? messages.dependencies.unknownVersion,
              )
            : ''
        }
        confirmLabel={messages.dependencies.update}
        cancelLabel={messages.common.cancel}
        onConfirm={() => void confirmUpdate()}
        onCancel={() => setPending(null)}
      />
    </section>
  )
}

function matchesFilter(
  item: ProjectDependency,
  filter: DependencyFilter,
): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'managed') {
    return item.kind === 'direct' || item.kind === 'dev'
  }
  return item.kind === filter
}
