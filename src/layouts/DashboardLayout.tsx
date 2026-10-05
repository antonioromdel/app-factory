import { useEffect, type ReactElement } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Sidebar } from './Sidebar.tsx'
import { Topbar } from './Topbar.tsx'
import { findNavItem, type Breadcrumb } from './navigation.ts'
import styles from './DashboardLayout.module.css'

export function DashboardLayout(): ReactElement {
  const { pathname } = useLocation()
  const current = findNavItem(pathname)
  const title = pageTitle(pathname, current?.label)
  const breadcrumbs = pageBreadcrumbs(pathname, current?.label)

  useEffect(() => {
    document.title = `${title} · App Factory`
  }, [title])

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

function pageTitle(pathname: string, section: string | undefined): string {
  if (pathname === '/applications/new') {
    return 'New application'
  }

  if (/^\/applications\/[^/]+\/edit$/.test(pathname)) {
    return 'Edit application'
  }

  if (/^\/applications\/[^/]+$/.test(pathname)) {
    return 'Application'
  }

  return section ?? 'App Factory'
}

function pageBreadcrumbs(
  pathname: string,
  section: string | undefined,
): Breadcrumb[] {
  if (!section || section === 'Dashboard') {
    return []
  }

  const crumbs: Breadcrumb[] = [
    { label: 'Dashboard', to: '/' },
    { label: section, to: sectionPath(section) },
  ]

  if (pathname === '/applications/new') {
    crumbs.push({ label: 'New application' })
  } else if (/^\/applications\/[^/]+\/edit$/.test(pathname)) {
    crumbs.push({ label: 'Edit' })
  } else if (/^\/applications\/[^/]+$/.test(pathname)) {
    crumbs.push({ label: 'Details' })
  } else {
    crumbs[1] = { label: section }
  }

  return crumbs
}

function sectionPath(section: string): string {
  const paths: Record<string, string> = {
    Applications: '/applications',
    Knowledge: '/knowledge',
    Checklists: '/checklists',
    Assets: '/assets',
    Releases: '/releases',
    Settings: '/settings',
  }

  return paths[section] ?? '/'
}
