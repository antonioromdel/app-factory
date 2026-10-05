import type { ReactElement, ReactNode } from 'react'
import styles from './Badge.module.css'

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger'

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: BadgeTone
  children: ReactNode
}): ReactElement {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>
}
