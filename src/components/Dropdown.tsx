import { useEffect, useRef, useState, type ReactElement } from 'react'
import { joinClasses } from '@/utils/joinClasses.ts'
import { Button } from './Button.tsx'
import styles from './Dropdown.module.css'

interface DropdownItem {
  id: string
  label: string
  onSelect: () => void
  disabled?: boolean
}

export function Dropdown({
  label,
  items,
  message,
  closeOnSelect = true,
  className,
}: {
  label: string
  items: DropdownItem[]
  message?: string | null
  closeOnSelect?: boolean
  className?: string
}): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent): void {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (!rootRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className={joinClasses(styles.root, className)} ref={rootRef}>
      <Button
        variant="secondary"
        className={styles.trigger}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => {
          setIsOpen((open) => !open)
        }}
      >
        {label}
      </Button>
      {isOpen ? (
        <div className={styles.menu} role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              className={styles.item}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect()
                if (closeOnSelect) {
                  setIsOpen(false)
                }
              }}
            >
              {item.label}
            </button>
          ))}
          {message ? (
            <p className={styles.message} role="alert">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
