import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/Badge.tsx'
import { Card } from '@/components/Card.tsx'
import {
  useFirebaseConnection,
  type FirebaseConnectionState,
} from '@/hooks/useFirebaseConnection.ts'
import styles from './DashboardPage.module.css'

const stats = [
  { title: 'Total applications', detail: 'No records yet' },
  { title: 'In development', detail: 'No records yet' },
  { title: 'Published', detail: 'No records yet' },
  { title: 'Pending publication', detail: 'No records yet' },
] as const

const panels = [
  {
    title: 'Recent projects',
    detail: 'No applications yet.',
    to: '/applications',
    action: 'Open applications',
  },
  {
    title: 'Recently modified',
    detail: 'Nothing has been updated yet.',
  },
  {
    title: 'Pending tasks',
    detail: 'No tasks yet.',
    to: '/checklists',
    action: 'Open checklists',
  },
  {
    title: 'Upcoming releases',
    detail: 'No releases yet.',
    to: '/releases',
    action: 'Open releases',
  },
] as const

export function DashboardPage(): ReactElement {
  const connection = useFirebaseConnection()
  const status = connectionStatus(connection)

  return (
    <div className={styles.page}>
      <div className={styles.statusRow}>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <section className={styles.stats} aria-label="Overview">
        {stats.map((stat) => (
          <Card key={stat.title} title={stat.title}>
            <p className={styles.detail}>{stat.detail}</p>
          </Card>
        ))}
      </section>

      <section className={styles.panels} aria-label="Activity">
        {panels.map((panel) => (
          <Card key={panel.title} title={panel.title}>
            <p className={styles.detail}>{panel.detail}</p>
            {'to' in panel ? (
              <Link className={styles.link} to={panel.to}>
                {panel.action}
              </Link>
            ) : null}
          </Card>
        ))}
      </section>

      <Card title="Quick actions">
        <div className={styles.actions}>
          <Link className={styles.link} to="/knowledge">
            Open knowledge base
          </Link>
        </div>
        <p className={styles.detail}>
          New application, open application, generate assets and prepare release
          will appear here when those tools exist.
        </p>
      </Card>
    </div>
  )
}

function connectionStatus(connection: FirebaseConnectionState): {
  label: string
  tone: 'neutral' | 'success' | 'danger'
} {
  if (connection.status === 'loading') {
    return { label: 'Checking Firebase connection…', tone: 'neutral' }
  }

  if (connection.status === 'connected') {
    return {
      label: `Connected to ${connection.projectId}`,
      tone: 'success',
    }
  }

  return { label: connection.message, tone: 'danger' }
}
