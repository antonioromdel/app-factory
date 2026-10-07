import type { ReactElement, ReactNode } from 'react'
import { Factory } from 'lucide-react'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LanguageSelect } from '@/components/LanguageSelect.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { useLanguage } from '@/hooks/useLanguage.ts'
import styles from './AuthLayout.module.css'

export function AuthLayout({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const { messages } = useLanguage()

  return (
    <main className={styles.shell}>
      <div className={styles.panel}>
        <LanguageSelect className={styles.language} />
        <div className={styles.brand}>
          <Factory size={28} strokeWidth={1.5} aria-hidden="true" />
          <span>{messages.brand}</span>
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
