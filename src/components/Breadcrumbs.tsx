import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { useLanguage } from '@/hooks/useLanguage.ts'
import styles from './Breadcrumbs.module.css'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export function Breadcrumbs({
  items,
}: {
  items: BreadcrumbItem[]
}): ReactElement | null {
  const { messages } = useLanguage()

  if (items.length === 0) {
    return null
  }

  return (
    <nav aria-label={messages.nav.breadcrumb}>
      <ol className={styles.list}>
        {items.map((item, index) => (
          <li key={item.label} className={styles.crumb}>
            {index > 0 ? (
              <span className={styles.separator} aria-hidden="true">
                /
              </span>
            ) : null}
            {item.to ? (
              <Link className={styles.link} to={item.to}>
                {item.label}
              </Link>
            ) : (
              <span className={styles.current} aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
