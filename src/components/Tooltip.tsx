import type { ReactElement, ReactNode } from 'react'
import styles from './Tooltip.module.css'

export function Tooltip({
  content,
  children,
}: {
  content: string
  children: ReactNode
}): ReactElement {
  return (
    <span className={styles.wrap}>
      {children}
      <span className={styles.tip} role="tooltip">
        {content}
      </span>
    </span>
  )
}
