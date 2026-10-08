import { useEffect, type ReactElement } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { Messages } from '@/i18n/en.ts'
import { Sidebar } from './Sidebar.tsx'
import { Topbar } from './Topbar.tsx'
import { findNavItem, type Breadcrumb, type NavId } from './navigation.ts'
import styles from './DashboardLayout.module.css'

export function DashboardLayout(): ReactElement {
  const { pathname } = useLocation()
  const { messages } = useLanguage()
  const current = findNavItem(pathname)
  const title = pageTitle(pathname, current?.id, messages)
  const breadcrumbs = pageBreadcrumbs(pathname, current?.id, messages)

  useEffect(() => {
    document.title = messages.shell.documentTitle(title)
  }, [messages, title])

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.workspace}>
        <Topbar title={title} breadcrumbs={breadcrumbs} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function pageTitle(
  pathname: string,
  section: NavId | undefined,
  messages: Messages,
): string {
  if (pathname === '/applications/new') {
    return messages.shell.newApplication
  }

  if (pathname === '/knowledge/new') {
    return messages.shell.newArticle
  }

  if (/^\/applications\/[^/]+\/edit$/.test(pathname)) {
    return messages.shell.editApplication
  }

  if (/^\/knowledge\/[^/]+\/edit$/.test(pathname)) {
    return messages.shell.editArticle
  }

  if (/^\/applications\/[^/]+$/.test(pathname)) {
    return messages.shell.application
  }

  if (/^\/knowledge\/[^/]+$/.test(pathname)) {
    return messages.shell.article
  }

  return section ? messages.nav[section] : messages.brand
}

function pageBreadcrumbs(
  pathname: string,
  section: NavId | undefined,
  messages: Messages,
): Breadcrumb[] {
  if (!section || section === 'dashboard') {
    return []
  }

  const crumbs: Breadcrumb[] = [
    { label: messages.nav.dashboard, to: '/' },
    { label: messages.nav[section], to: sectionPath(section) },
  ]

  if (pathname === '/applications/new') {
    crumbs.push({ label: messages.shell.newApplication })
  } else if (pathname === '/knowledge/new') {
    crumbs.push({ label: messages.shell.newArticle })
  } else if (
    /^\/applications\/[^/]+\/edit$/.test(pathname) ||
    /^\/knowledge\/[^/]+\/edit$/.test(pathname)
  ) {
    crumbs.push({ label: messages.shell.edit })
  } else if (
    /^\/applications\/[^/]+$/.test(pathname) ||
    /^\/knowledge\/[^/]+$/.test(pathname)
  ) {
    crumbs.push({ label: messages.shell.details })
  } else {
    crumbs[1] = { label: messages.nav[section] }
  }

  return crumbs
}

function sectionPath(section: NavId): string {
  const paths: Record<NavId, string> = {
    dashboard: '/',
    applications: '/applications',
    knowledge: '/knowledge',
    checklists: '/checklists',
    assets: '/assets',
    releases: '/releases',
    settings: '/settings',
  }

  return paths[section]
}
