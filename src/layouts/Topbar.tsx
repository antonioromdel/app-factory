import { useState, type ReactElement } from 'react'
import { Search } from 'lucide-react'
import { useLocation } from 'react-router'
import { Breadcrumbs } from '@/components/Breadcrumbs.tsx'
import { Dropdown } from '@/components/Dropdown.tsx'
import { Input } from '@/components/Input.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { AuthError } from '@/services/authService.ts'
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
          label="Search"
          hideLabel
          type="search"
          placeholder="Search"
          leading={<Search size={20} strokeWidth={1.5} aria-hidden="true" />}
        />
      </form>
      <AccountMenu key={pathname} />
    </header>
  )
}

function AccountMenu(): ReactElement {
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
    <Dropdown
      label={user?.email ?? 'Account'}
      closeOnSelect={false}
      message={error}
      items={[
        {
          id: 'sign-out',
          label: isSigningOut ? 'Signing out…' : 'Sign out',
          disabled: isSigningOut,
          onSelect: () => {
            void handleSignOut()
          },
        },
      ]}
    />
  )
}
