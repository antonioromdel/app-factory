import type { ReactElement } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { assetToolIds, type AssetToolId } from '@/features/assets/assetTools.ts'
import { IconGenerator } from '@/features/assets/IconGenerator.tsx'
import { SplashGenerator } from '@/features/assets/SplashGenerator.tsx'
import { FlutterProject } from '@/features/flutter/FlutterProject.tsx'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { AssetLibrary } from '@/pages/AssetLibrary.tsx'
import styles from './AssetToolPage.module.css'

export function AssetToolPage(): ReactElement {
  const { toolId } = useParams()
  const { messages } = useLanguage()
  const tool = assetToolIds.find((id) => id === toolId)

  if (!tool) {
    return <Navigate to="/assets" replace />
  }

  return (
    <div className={styles.page}>
      <Link className={styles.back} to="/assets">
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        {messages.assets.back}
      </Link>
      <ToolView tool={tool} />
    </div>
  )
}

function ToolView({ tool }: { tool: AssetToolId }): ReactElement {
  if (tool === 'icons') {
    return <IconGenerator />
  }

  if (tool === 'splash') {
    return <SplashGenerator />
  }

  if (tool === 'project') {
    return <FlutterProject />
  }

  return <AssetLibrary />
}
