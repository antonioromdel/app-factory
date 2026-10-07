import type { ReactElement } from 'react'
import { Checkbox } from '@/components/Checkbox.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import {
  categoryCounts,
  checklistCounts,
} from '@/features/checklists/checklistProgress.ts'
import { useChecklistProgress } from '@/hooks/useChecklistProgress.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  checklistCategories,
  itemsInCategory,
  type ChecklistItemId,
} from '@/types/checklist.ts'
import styles from './Checklist.module.css'

export function ApplicationChecklist({
  applicationId,
}: {
  applicationId: string
}): ReactElement {
  const { messages } = useLanguage()
  const { status, completed, errorCode, isSaving, reload, toggle } =
    useChecklistProgress(applicationId)

  if (status === 'loading') {
    return <LoadingState message={messages.checklist.loading} />
  }

  if (status === 'error') {
    return (
      <ErrorState
        message={messages.checklist.errors[errorCode ?? 'load']}
        onRetry={reload}
      />
    )
  }

  const counts = checklistCounts(completed)

  return (
    <div className={styles.page}>
      <p className={styles.summary}>
        <span className={styles.count}>
          {messages.checklist.fraction(counts.completed, counts.total)}
        </span>
        <span className={styles.percent}>
          {messages.checklist.percent(counts.percent)}
        </span>
      </p>
      <progress
        className={styles.bar}
        value={counts.completed}
        max={counts.total}
        aria-label={messages.checklist.progressLabel(
          counts.completed,
          counts.total,
          counts.percent,
        )}
      />
      {isSaving ? (
        <p className={styles.saving} role="status">
          {messages.common.saving}
        </p>
      ) : null}
      {errorCode ? (
        <ErrorState message={messages.checklist.errors[errorCode]} />
      ) : null}
      <div className={styles.categories}>
        {checklistCategories.map((category) => {
          const categoryCount = categoryCounts(category, completed)

          return (
            <section key={category} className={styles.category}>
              <div className={styles.categoryHeader}>
                <h3 className={styles.categoryTitle}>
                  {messages.checklist.categories[category]}
                </h3>
                <p className={styles.categoryCount}>
                  {messages.checklist.fraction(
                    categoryCount.completed,
                    categoryCount.total,
                  )}
                </p>
              </div>
              <ul className={styles.items}>
                {itemsInCategory(category).map((item) => (
                  <ChecklistTask
                    key={item.id}
                    itemId={item.id}
                    label={messages.checklist.items[item.id]}
                    checked={completed.includes(item.id)}
                    disabled={isSaving}
                    onToggle={toggle}
                  />
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function ChecklistTask({
  itemId,
  label,
  checked,
  disabled,
  onToggle,
}: {
  itemId: ChecklistItemId
  label: string
  checked: boolean
  disabled: boolean
  onToggle: (itemId: ChecklistItemId) => Promise<void>
}): ReactElement {
  return (
    <li className={checked ? styles.done : undefined}>
      <Checkbox
        label={label}
        checked={checked}
        disabled={disabled}
        onChange={() => {
          void onToggle(itemId)
        }}
      />
    </li>
  )
}
