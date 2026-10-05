import { useState, type FormEvent, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Input } from '@/components/Input.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { AuthLayout } from '@/layouts/AuthLayout.tsx'
import { AuthError } from '@/services/authService.ts'
import styles from './LoginPage.module.css'

export function LoginPage(): ReactElement {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setError('Enter your email.')
      return
    }

    if (!password) {
      setError('Enter your password.')
      return
    }

    setIsSubmitting(true)

    try {
      await signIn(trimmedEmail, password)
    } catch (caught: unknown) {
      setError(
        caught instanceof AuthError ? caught.message : 'Could not sign in.',
      )
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <header className={styles.header}>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>Use your App Factory account.</p>
      </header>
      <form
        className={styles.form}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <Input
          id="email"
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          disabled={isSubmitting}
          onChange={(event) => {
            setEmail(event.target.value)
            setError(null)
          }}
        />
        <Input
          id="password"
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          disabled={isSubmitting}
          onChange={(event) => {
            setPassword(event.target.value)
            setError(null)
          }}
        />
        {error ? <ErrorState message={error} /> : null}
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
