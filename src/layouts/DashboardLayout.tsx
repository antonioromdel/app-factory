import { useEffect, type ReactElement } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Sidebar } from './Sidebar.tsx'
import { Topbar } from './Topbar.tsx'
import { findNavItem, type Breadcrumb } from './navigation.ts'
import styles from './DashboardLayout.module.css'

export function DashboardLayout(): ReactElement {
  const { pathname } = useLocation()
  const current = findNavItem(pathname)
  const title = current?.label ?? 'App Factory'
  const breadcrumbs: Breadcrumb[] =
    current && current.to !== '/'
      ? [{ label: 'Dashboard', to: '/' }, { label: current.label }]
      : []

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
