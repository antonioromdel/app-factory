import type { ReactElement, ReactNode } from 'react'
import { Factory } from 'lucide-react'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import styles from './AuthLayout.module.css'

export function AuthLayout({
  children,
}: {
  children: ReactNode
}): ReactElement {
  return (
    <main className={styles.shell}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <Factory size={28} strokeWidth={1.5} aria-hidden="true" />
          <span>App Factory</span>
        </div>
        {children}
      </div>
    </main>
  )
}

export function AuthStatus({
  message,
  tone,
}: {
  message: string
  tone: 'status' | 'alert'
}): ReactElement {
  return (
    <AuthLayout>
      {tone === 'alert' ? (
        <ErrorState message={message} />
      ) : (
        <LoadingState message={message} />
      )}
    </AuthLayout>
  )
}
