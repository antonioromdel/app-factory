import { useState, type ReactElement, type ReactNode } from 'react'
import styles from './Tabs.module.css'

interface TabItem {
  id: string
  label: string
  content: ReactNode
}

export function Tabs({
  label,
  tabs,
}: {
  label: string
  tabs: TabItem[]
}): ReactElement | null {
  const [selectedId, setSelectedId] = useState(tabs[0]?.id ?? '')
  const selected = tabs.find((tab) => tab.id === selectedId) ?? tabs[0]

  if (!selected) {
    return null
  }

  function selectByOffset(offset: number): void {
    const currentIndex = tabs.findIndex((tab) => tab.id === selected?.id)
    const next = tabs[(currentIndex + offset + tabs.length) % tabs.length]
    if (next) {
      setSelectedId(next.id)
    }
  }

  return (
    <div className={styles.tabs}>
      <div
        className={styles.list}
        role="tablist"
        aria-label={label}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            selectByOffset(1)
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            selectByOffset(-1)
          }
        }}
      >
        {tabs.map((tab) => {
          const isSelected = tab.id === selected.id

          return (
            <button
              key={tab.id}
              className={
                isSelected ? `${styles.tab} ${styles.selected}` : styles.tab
              }
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => {
                setSelectedId(tab.id)
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div
        className={styles.panel}
        role="tabpanel"
        id={`panel-${selected.id}`}
        aria-labelledby={`tab-${selected.id}`}
      >
        {selected.content}
      </div>
    </div>
  )
}
