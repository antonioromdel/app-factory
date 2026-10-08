import type { ReactElement } from 'react'
import { Checkbox } from '@/components/Checkbox.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import {
  categoryCounts,
  checklistCounts,
  resolveChecklistItems,
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
  const {
    status,
    itemIds,
    completed,
    templateId,
    errorCode,
    isSaving,
    reload,
    toggle,
  } = useChecklistProgress(applicationId)

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

  const items = resolveChecklistItems(itemIds)
  const counts = checklistCounts(completed, items)

  return (
    <div className={styles.page}>
      {templateId ? (
        <p className={styles.intro}>
          {messages.checklist.templates[templateId]}
        </p>
      ) : null}
      <p className={styles.summary}>
        <span className={styles.count}>
          {messages.checklist.fraction(counts.completed, counts.total)}
        </span>
        <span className={styles.percent}>
          {messages.checklist.percent(counts.percent)}
        </span>
      </p>
      {counts.total > 0 ? (
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
      ) : null}
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
          const categoryCount = categoryCounts(category, completed, items)
          if (categoryCount.total === 0) {
            return null
          }

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
                {itemsInCategory(category)
                  .filter((item) => items.includes(item.id))
                  .map((item) => (
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
