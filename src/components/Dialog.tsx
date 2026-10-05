import type { ReactElement, ReactNode } from 'react'
import { Modal } from './Modal.tsx'
import styles from './Dialog.module.css'

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children?: ReactNode
  footer?: ReactNode
}): ReactElement | null {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      {description ? <p className={styles.description}>{description}</p> : null}
      {children}
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </Modal>
  )
}
