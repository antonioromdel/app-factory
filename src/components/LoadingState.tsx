import type { ReactElement } from 'react'
import styles from './LoadingState.module.css'

export function LoadingState({ message }: { message: string }): ReactElement {
  return (
    <p className={styles.state} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      {message}
    </p>
  )
}
