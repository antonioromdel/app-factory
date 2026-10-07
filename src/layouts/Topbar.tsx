import { useState, type ReactElement } from 'react'
import { Search } from 'lucide-react'
import { useLocation } from 'react-router'
import { Breadcrumbs } from '@/components/Breadcrumbs.tsx'
import { Dropdown } from '@/components/Dropdown.tsx'
import { Input } from '@/components/Input.tsx'
import { LanguageSelect } from '@/components/LanguageSelect.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { AuthError, type AuthErrorCode } from '@/services/authService.ts'
import type { Breadcrumb } from './navigation.ts'
import styles from './Topbar.module.css'

export function Topbar({
  title,
  breadcrumbs,
}: {
  title: string
  breadcrumbs: Breadcrumb[]
}): ReactElement {
  const { pathname } = useLocation()
  const { messages } = useLanguage()

  return (
    <header className={styles.topbar}>
      <div className={styles.titleBlock}>
        <Breadcrumbs items={breadcrumbs} />
        <h1 className={styles.title}>{title}</h1>
      </div>
      <form
        className={styles.search}
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <Input
          className={styles.searchField}
          label={messages.common.search}
          hideLabel
          type="search"
          placeholder={messages.common.search}
          leading={<Search size={20} strokeWidth={1.5} aria-hidden="true" />}
        />
      </form>
      <LanguageSelect className={styles.language} />
      <AccountMenu key={pathname} />
    </header>
  )
}

function AccountMenu(): ReactElement {
  const { user, signOut } = useAuth()
  const { messages } = useLanguage()
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

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
    <Dropdown
      label={user?.email ?? messages.common.account}
      closeOnSelect={false}
      message={errorCode ? messages.auth.errors[errorCode] : null}
      items={[
        {
          id: 'sign-out',
          label: isSigningOut
            ? messages.auth.signingOut
            : messages.auth.signOut,
          disabled: isSigningOut,
          onSelect: () => {
            void handleSignOut()
          },
        },
      ]}
    />
  )
}
