import { useEffect, useState, type ReactElement } from 'react'
import { Search } from 'lucide-react'
import { useLocation } from 'react-router'
import { Breadcrumbs } from '@/components/Breadcrumbs.tsx'
import { Dropdown } from '@/components/Dropdown.tsx'
import { LanguageSelect } from '@/components/LanguageSelect.tsx'
import { GlobalSearch } from '@/features/search/GlobalSearch.tsx'
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchSession, setSearchSession] = useState(0)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.repeat) {
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (searchOpen) {
          setSearchOpen(false)
          return
        }

        setSearchSession((current) => current + 1)
        setSearchOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [searchOpen])

  return (
    <header className={styles.topbar}>
      <div className={styles.titleBlock}>
        <Breadcrumbs items={breadcrumbs} />
        <h1 className={styles.title}>{title}</h1>
      </div>
      <button
        className={styles.searchButton}
        type="button"
        aria-keyshortcuts="Control+K"
        onClick={() => {
          setSearchSession((current) => current + 1)
          setSearchOpen(true)
        }}
      >
        <Search size={20} strokeWidth={1.5} aria-hidden="true" />
        <span>{messages.search.placeholder}</span>
        <kbd>{messages.search.shortcut}</kbd>
      </button>
      <LanguageSelect className={styles.language} />
      <AccountMenu key={pathname} />
      <GlobalSearch
        open={searchOpen}
        session={searchSession}
        onClose={() => setSearchOpen(false)}
      />
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
