import type { ReactElement } from 'react'
import { Badge } from '@/components/Badge.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import {
  type PreparationStep,
  type PreparationStepStatus,
} from '@/features/releases/releasePreparation.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { PreparationErrorCode } from '@/services/localReleasePreparationService.ts'
import styles from './ReleasePreparation.module.css'

const statusTone = {
  pending: 'neutral',
  running: 'info',
  success: 'success',
  warning: 'warning',
  failed: 'danger',
} as const satisfies Record<PreparationStepStatus, string>

export function ReleasePreparation({
  steps,
  running,
  errorCode,
}: {
  steps: PreparationStep[]
  running: boolean
  errorCode: PreparationErrorCode | null
}): ReactElement {
  const { messages } = useLanguage()
  const copy = messages.releases.preparation
  const finished = steps.some((step) => step.status !== 'pending') && !running
  const succeeded = steps.filter((step) => step.status === 'success').length
  const warnings = steps.filter((step) => step.status === 'warning').length
  const failed = steps.filter((step) => step.status === 'failed').length

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{copy.title}</h3>
      {errorCode ? <ErrorState message={copy.errors[errorCode]} /> : null}
      {finished ? (
        <p className={styles.summary}>
          {copy.summary(succeeded, warnings, failed)}
        </p>
      ) : null}
      <ol className={styles.list}>
        {steps.map((step) => (
          <li key={step.id} className={styles.step}>
            <div className={styles.row}>
              <span className={styles.name}>{copy.steps[step.id]}</span>
              <Badge tone={statusTone[step.status]}>
                {copy.statuses[step.status]}
              </Badge>
            </div>
            {step.reason ? (
              <p className={styles.reason}>{copy.reasons[step.reason]}</p>
            ) : null}
            {step.output ? (
              <pre className={styles.terminal}>{step.output}</pre>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}
