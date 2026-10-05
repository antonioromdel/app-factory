import type { ReactElement, ReactNode } from 'react'
import styles from './EmptyState.module.css'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}): ReactElement {
  return (
    <div className={styles.state}>
      <h2 className={styles.title}>{title}</h2>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action}
    </div>
  )
}
