import type { ReactElement } from 'react'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  checklistCategories,
  checklistItems,
  itemsInCategory,
} from '@/types/checklist.ts'
import styles from './Checklist.module.css'

export function ChecklistCatalog(): ReactElement {
  const { messages } = useLanguage()

  return (
    <div className={styles.page}>
      <p className={styles.intro}>
        {messages.checklist.sharedLead(checklistItems.length)}
      </p>
      <div className={styles.categories}>
        {checklistCategories.map((category) => {
          const items = itemsInCategory(category)

          return (
            <section key={category} className={styles.category}>
              <div className={styles.categoryHeader}>
                <h2 className={styles.categoryTitle}>
                  {messages.checklist.categories[category]}
                </h2>
                <p className={styles.categoryCount}>
                  {messages.checklist.taskCount(items.length)}
                </p>
              </div>
              <ul className={styles.items}>
                {items.map((item) => (
                  <li key={item.id} className={styles.catalogItem}>
                    {messages.checklist.items[item.id]}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
