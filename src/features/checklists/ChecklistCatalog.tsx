import type { ReactElement } from 'react'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { itemsInCategory } from '@/types/checklist.ts'
import {
  checklistTemplateIds,
  templateCategoriesFor,
  templateItemIds,
} from '@/types/checklistTemplates.ts'
import styles from './Checklist.module.css'

export function ChecklistCatalog(): ReactElement {
  const { messages } = useLanguage()

  return (
    <div className={styles.page}>
      <p className={styles.intro}>{messages.checklist.sharedLead}</p>
      <div className={styles.templates}>
        {checklistTemplateIds.map((templateId) => {
          const included = new Set(templateItemIds(templateId))

          return (
            <section
              key={templateId}
              id={`template-${templateId}`}
              className={styles.template}
            >
              <div className={styles.categoryHeader}>
                <h2 className={styles.categoryTitle}>
                  {messages.checklist.templates[templateId]}
                </h2>
                <p className={styles.categoryCount}>
                  {messages.checklist.taskCount(included.size)}
                </p>
              </div>
              <p className={styles.intro}>
                {messages.checklist.templateDescriptions[templateId]}
              </p>
              <div className={styles.categories}>
                {templateCategoriesFor(templateId).map((category) => {
                  const items = itemsInCategory(category).filter((item) =>
                    included.has(item.id),
                  )
                  if (items.length === 0) {
                    return null
                  }

                  return (
                    <section key={category} className={styles.category}>
                      <h3 className={styles.groupTitle}>
                        {messages.checklist.categories[category]}
                      </h3>
                      <ul className={styles.items}>
                        {items.map((item) => (
                          <li
                            key={item.id}
                            id={`${templateId}-${item.id}`}
                            className={styles.catalogItem}
                          >
                            {messages.checklist.items[item.id]}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
