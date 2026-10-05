import { useState, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { AuthLayout } from '@/layouts/AuthLayout.tsx'
import { AuthError } from '@/services/authService.ts'
import styles from './AccessDeniedPage.module.css'

export function AccessDeniedPage(): ReactElement {
  const { user, signOut } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut(): Promise<void> {
    setError(null)
    setIsSigningOut(true)

    try {
      await signOut()
    } catch (caught: unknown) {
      setError(
        caught instanceof AuthError ? caught.message : 'Could not sign out.',
      )
      setIsSigningOut(false)
    }
  }

  return (
    <AuthLayout>
      <div className={styles.panel}>
        <h1 className={styles.title}>Access denied</h1>
        <p className={styles.message}>
          {user?.email
            ? `${user.email} is not allowed to use App Factory.`
            : 'This account is not allowed to use App Factory.'}
        </p>
        {error ? <ErrorState message={error} /> : null}
        <Button
          variant="secondary"
          disabled={isSigningOut}
          onClick={() => void handleSignOut()}
        >
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </AuthLayout>
  )
}
