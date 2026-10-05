import type { ReactElement } from 'react'
import { Factory } from 'lucide-react'
import { NavLink } from 'react-router'
import { navigation } from './navigation.ts'
import styles from './Sidebar.module.css'

export function Sidebar(): ReactElement {
  return (
    <aside className={styles.sidebar}>
      <p className={styles.brand}>
        <Factory size={26} strokeWidth={1.5} aria-hidden="true" />
        App Factory
      </p>
      <nav className={styles.nav} aria-label="Main">
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
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
