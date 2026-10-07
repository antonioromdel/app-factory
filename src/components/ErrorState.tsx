import type { ReactElement } from 'react'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { Button } from './Button.tsx'
import styles from './ErrorState.module.css'

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}): ReactElement {
  const { messages } = useLanguage()

  return (
    <div className={styles.state} role="alert">
      <p className={styles.message}>{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {messages.common.tryAgain}
        </Button>
      ) : null}
    </div>
  )
}
