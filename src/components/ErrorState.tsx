import type { ReactElement } from 'react'
import { Button } from './Button.tsx'
import styles from './ErrorState.module.css'

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}): ReactElement {
  return (
    <div className={styles.state} role="alert">
      <p className={styles.message}>{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
