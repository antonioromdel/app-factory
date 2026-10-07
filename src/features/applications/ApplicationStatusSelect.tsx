import { useState, type ReactElement } from 'react'
import { Select } from '@/components/Select.tsx'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  applicationErrorCode,
  updateApplicationStatus,
} from '@/services/applicationService.ts'
import {
  applicationStatuses,
  type ApplicationStatus,
} from '@/types/application.ts'

export function ApplicationStatusSelect({
  applicationId,
  status,
  className,
  onArchive,
  onChanged,
  onError,
}: {
  applicationId: string
  status: ApplicationStatus | undefined
  className?: string
  onArchive: () => void
  onChanged: () => void
  onError: (message: string) => void
}): ReactElement {
  const { messages } = useLanguage()
  const [isSaving, setIsSaving] = useState(false)

  async function save(next: ApplicationStatus): Promise<void> {
    setIsSaving(true)

    try {
      await updateApplicationStatus(applicationId, next)
      onChanged()
    } catch (error: unknown) {
      onError(messages.applicationErrors[applicationErrorCode(error, 'save')])
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Select
      className={className}
      label={messages.fields.status}
      value={status ?? ''}
      disabled={isSaving}
      options={[
        ...(status ? [] : [{ value: '', label: messages.common.notSet }]),
        ...applicationStatuses.map((item) => ({
          value: item,
          label: messages.status[item],
        })),
      ]}
      onChange={(event) => {
        const next = event.target.value
        if (!isApplicationStatus(next) || next === status) {
          return
        }

        if (next === 'ARCHIVED') {
          onArchive()
          return
        }

        void save(next)
      }}
    />
  )
}

function isApplicationStatus(value: string): value is ApplicationStatus {
  return applicationStatuses.some((status) => status === value)
}
