import type { ReactElement } from 'react'
import { Droplet, FolderPlus, Image, Images } from 'lucide-react'
import { Link } from 'react-router'
import { assetToolIds, type AssetToolId } from '@/features/assets/assetTools.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import styles from './AssetsPage.module.css'

const toolIcons = {
  icons: Image,
  splash: Droplet,
  project: FolderPlus,
  library: Images,
} as const satisfies Record<AssetToolId, typeof Image>

export function AssetsPage(): ReactElement {
  const { messages } = useLanguage()

  return (
    <div className={styles.page}>
      <p className={styles.lead}>{messages.assets.toolsLead}</p>
      <ul className={styles.grid}>
        {assetToolIds.map((id) => {
          const Icon = toolIcons[id]
          const tool = messages.assets.tools[id]

          return (
            <li key={id}>
              <Link className={styles.card} to={`/assets/${id}`}>
                <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                <span className={styles.cardTitle}>{tool.title}</span>
                <span className={styles.cardDescription}>
                  {tool.description}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
