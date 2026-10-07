import { useEffect, useState, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { AuthLayout } from '@/layouts/AuthLayout.tsx'
import { AuthError, type AuthErrorCode } from '@/services/authService.ts'
import styles from './AccessDeniedPage.module.css'

export function AccessDeniedPage(): ReactElement {
  const { user, signOut } = useAuth()
  const { messages } = useLanguage()
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    document.title = messages.shell.documentTitle(messages.auth.accessDenied)
  }, [messages])

  async function handleSignOut(): Promise<void> {
    setErrorCode(null)
    setIsSigningOut(true)

    try {
      await signOut()
    } catch (caught: unknown) {
      setErrorCode(caught instanceof AuthError ? caught.code : 'sign-out')
      setIsSigningOut(false)
    }
  }

  return (
    <AuthLayout>
      <div className={styles.panel}>
        <h1 className={styles.title}>{messages.auth.accessDenied}</h1>
        <p className={styles.message}>
          {user?.email
            ? messages.auth.deniedEmail(user.email)
            : messages.auth.deniedAccount}
        </p>
        {errorCode ? (
          <ErrorState message={messages.auth.errors[errorCode]} />
        ) : null}
        <Button
          variant="secondary"
          disabled={isSigningOut}
          onClick={() => void handleSignOut()}
        >
          {isSigningOut ? messages.auth.signingOut : messages.auth.signOut}
        </Button>
      </div>
    </AuthLayout>
  )
}
