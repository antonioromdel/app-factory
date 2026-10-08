import { useState, type ReactElement } from 'react'
import { Select } from '@/components/Select.tsx'
import { FlutterProject } from '@/features/flutter/FlutterProject.tsx'
import { LinkProject } from '@/features/flutter/LinkProject.tsx'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { Application } from '@/types/application.ts'
import styles from './ProjectSource.module.css'

type ProjectMode = 'create' | 'link'

export function ProjectSource({
  application,
  onSaved,
}: {
  application: Application
  onSaved: () => void
}): ReactElement {
  const { messages } = useLanguage()
  const [mode, setMode] = useState<ProjectMode>(() =>
    application.repository?.localPath ? 'link' : 'create',
  )

  return (
    <div className={styles.section}>
      <div className={styles.choice}>
        <Select
          label={messages.projectLink.mode}
          value={mode}
          options={[
            { value: 'create', label: messages.projectLink.createOption },
            { value: 'link', label: messages.projectLink.linkOption },
          ]}
          onChange={(event) => {
            const value = event.target.value
            if (value === 'create' || value === 'link') {
              setMode(value)
            }
          }}
        />
      </div>
      {mode === 'create' ? (
        <FlutterProject
          application={application}
          onSaved={onSaved}
          linkOnCreate
        />
      ) : (
        <LinkProject application={application} onSaved={onSaved} />
      )}
    </div>
  )
}
