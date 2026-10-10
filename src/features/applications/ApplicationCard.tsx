import { useEffect, useRef, useState, type ReactElement } from 'react'
import { ArrowRight, Layers, Settings } from 'lucide-react'
import { Link } from 'react-router'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { Application } from '@/types/application.ts'
import {
  isReadyToBuild,
  repositoryLabel,
  updatedLabel,
} from './applicationDisplay.ts'
import styles from './ApplicationCard.module.css'

export function ApplicationCard({
  application,
  busy = false,
  onDuplicate,
  onArchive,
}: {
  application: Application
  busy?: boolean
  onDuplicate?: () => void
  onArchive?: () => void
}): ReactElement {
  const { language, messages } = useLanguage()
  const ready = isReadyToBuild(application)
  const repository = repositoryLabel(application)
  const subtitle = repository
    ? repository
    : `${messages.applications.updatedPrefix}: ${updatedLabel(application, language)}`
  const actionLabel = ready
    ? messages.applications.startBuild
    : messages.applications.finishSetup
  const destination = `/applications/${application.id}?tab=development`
  const hasMenu = Boolean(onDuplicate || onArchive)

  return (
    <article className={styles.card}>
      <div className={styles.identity}>
        <span className={ready ? styles.iconReady : styles.icon}>
          <span className={styles.glyph}>
            <Layers size={22} strokeWidth={1.75} aria-hidden="true" />
          </span>
        </span>
        <div className={styles.copy}>
          <Link className={styles.name} to={`/applications/${application.id}`}>
            {application.name}
          </Link>
          <p className={styles.meta}>{subtitle}</p>
        </div>
      </div>
      <div className={styles.actions}>
        {hasMenu ? (
          <CardMenu
            application={application}
            busy={busy}
            onDuplicate={onDuplicate}
            onArchive={onArchive}
          />
        ) : (
          <Link
            className={styles.gear}
            to={`/applications/${application.id}/edit`}
            aria-label={`${messages.applications.settings}: ${application.name}`}
          >
            <Settings size={18} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        )}
        <Link
          className={ready ? styles.primaryAction : styles.outlineAction}
          to={destination}
          aria-label={`${actionLabel}: ${application.name}`}
        >
          {actionLabel}
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

function CardMenu({
  application,
  busy,
  onDuplicate,
  onArchive,
}: {
  application: Application
  busy: boolean
  onDuplicate?: () => void
  onArchive?: () => void
}): ReactElement {
  const { messages } = useLanguage()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent): void {
      const target = event.target
      if (!(target instanceof Node) || rootRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className={styles.menuRoot} ref={rootRef}>
      <button
        className={styles.gear}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${messages.applications.settings}: ${application.name}`}
        onClick={() => setOpen((current) => !current)}
      >
        <Settings size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open ? (
        <div className={styles.menu} role="menu">
          <Link
            className={styles.menuItem}
            role="menuitem"
            to={`/applications/${application.id}/edit`}
            onClick={() => setOpen(false)}
          >
            {messages.applications.edit}
          </Link>
          {onDuplicate ? (
            <button
              className={styles.menuItem}
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => {
                setOpen(false)
                onDuplicate()
              }}
            >
              {messages.applications.duplicate}
            </button>
          ) : null}
          {onArchive && application.status !== 'ARCHIVED' ? (
            <button
              className={styles.menuItem}
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => {
                setOpen(false)
                onArchive()
              }}
            >
              {messages.applications.archive}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
