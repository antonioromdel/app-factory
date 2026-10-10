import type { ReactElement } from 'react'
import styles from './StepProgress.module.css'

export function StepProgress({
  name,
  current,
  total,
  completed,
  countLabel,
  barLabel,
  notice,
}: {
  name: string
  current: number | null
  total: number
  completed: number
  countLabel: string
  barLabel: string
  notice: string
}): ReactElement {
  return (
    <div className={styles.progress}>
      <p className={styles.status} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        <span>{name}</span>
        {current !== null ? (
          <span className={styles.count}>{countLabel}</span>
        ) : null}
      </p>
      <progress
        className={styles.bar}
        value={completed}
        max={total}
        aria-label={barLabel}
      />
      <p className={styles.notice}>{notice}</p>
    </div>
  )
}
