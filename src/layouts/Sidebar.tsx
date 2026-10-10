import type { ReactElement } from 'react'
import { Factory } from 'lucide-react'
import { NavLink } from 'react-router'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { navigation } from './navigation.ts'
import styles from './Sidebar.module.css'

export function Sidebar(): ReactElement {
  const { messages } = useLanguage()

  return (
    <aside className={styles.sidebar}>
      <p className={styles.brand}>
        <Factory
          className={styles.brandIcon}
          size={26}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        {messages.brand}
      </p>
      <nav className={styles.nav} aria-label={messages.nav.main}>
        {navigation.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
            >
              <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
              {messages.nav[item.id]}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
