import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Input } from '@/components/Input.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { Messages } from '@/i18n/en.ts'
import { AuthLayout } from '@/layouts/AuthLayout.tsx'
import { AuthError, type AuthErrorCode } from '@/services/authService.ts'
import styles from './LoginPage.module.css'

type LoginError = AuthErrorCode | 'enter-email' | 'enter-password'

export function LoginPage(): ReactElement {
  const { signIn } = useAuth()
  const { messages } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<LoginError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    document.title = messages.shell.documentTitle(messages.auth.signInTitle)
  }, [messages])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setError('enter-email')
      return
    }

    if (!password) {
      setError('enter-password')
      return
    }

    setIsSubmitting(true)

    try {
      await signIn(trimmedEmail, password)
    } catch (caught: unknown) {
      setError(caught instanceof AuthError ? caught.code : 'sign-in')
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <header className={styles.header}>
        <h1 className={styles.title}>{messages.auth.signInTitle}</h1>
        <p className={styles.subtitle}>{messages.auth.signInSubtitle}</p>
      </header>
      <form
        className={styles.form}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <Input
          id="email"
          label={messages.auth.email}
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
          label={messages.auth.password}
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
        {error ? (
          <ErrorState message={loginErrorText(error, messages)} />
        ) : null}
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? messages.auth.signingIn : messages.auth.signIn}
        </Button>
      </form>
    </AuthLayout>
  )
}

function loginErrorText(error: LoginError, messages: Messages): string {
  if (error === 'enter-email') {
    return messages.auth.enterEmail
  }

  if (error === 'enter-password') {
    return messages.auth.enterPassword
  }

  return messages.auth.errors[error]
}
