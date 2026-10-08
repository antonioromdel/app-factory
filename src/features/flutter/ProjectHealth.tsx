import { useState, type ReactElement } from 'react'
import { Badge } from '@/components/Badge.tsx'
import { Button } from '@/components/Button.tsx'
import { ConfirmDialog } from '@/components/ConfirmDialog.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  healthCheckIds,
  runProjectHealthCheck,
  type HealthCheckId,
  type HealthErrorCode,
  type HealthStatus,
} from '@/services/localHealthService.ts'
import styles from './ProjectHealth.module.css'

type StepStatus = 'pending' | 'running' | HealthStatus

interface Step {
  id: HealthCheckId
  status: StepStatus
  output: string
}

const statusTone = {
  pending: 'neutral',
  running: 'info',
  passed: 'success',
  warning: 'warning',
  failed: 'danger',
} as const

function pendingSteps(): Step[] {
  return healthCheckIds.map((id) => ({ id, status: 'pending', output: '' }))
}

export function ProjectHealth({
  directory,
}: {
  directory?: string
}): ReactElement {
  const { messages } = useLanguage()
  const [steps, setSteps] = useState<Step[]>(pendingSteps)
  const [running, setRunning] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [errorCode, setErrorCode] = useState<HealthErrorCode | null>(null)

  async function handleRun(): Promise<void> {
    if (!directory) {
      return
    }

    setConfirming(false)
    setRunning(true)
    setErrorCode(null)
    setSteps(pendingSteps())

    for (const id of healthCheckIds) {
      setSteps((current) =>
        current.map((step) =>
          step.id === id ? { ...step, status: 'running' } : step,
        ),
      )
      const result = await runProjectHealthCheck(directory, id)
      if (!result.ok) {
        setErrorCode(result.code)
        setSteps((current) =>
          current.map((step) =>
            step.id === id ? { ...step, status: 'failed' } : step,
          ),
        )
        setRunning(false)
        return
      }

      setSteps((current) =>
        current.map((step) =>
          step.id === id
            ? { id, status: result.status, output: result.output }
            : step,
        ),
      )
    }

    setRunning(false)
  }

  const finished = steps.every(
    (step) => step.status !== 'pending' && step.status !== 'running',
  )
  const passed = steps.filter((step) => step.status === 'passed').length
  const warnings = steps.filter((step) => step.status === 'warning').length
  const failed = steps.filter((step) => step.status === 'failed').length

  return (
    <section className={styles.section}>
      <div className={styles.intro}>
        <h2 className={styles.title}>{messages.projectHealth.title}</h2>
        <p className={styles.lead}>{messages.projectHealth.lead}</p>
      </div>

      {directory ? (
        <Button disabled={running} onClick={() => setConfirming(true)}>
          {running
            ? messages.projectHealth.running
            : messages.projectHealth.run}
        </Button>
      ) : (
        <p className={styles.hint}>{messages.projectHealth.needsFolder}</p>
      )}

      {errorCode ? (
        <ErrorState message={messages.projectHealth.errors[errorCode]} />
      ) : null}

      {directory && finished && !running ? (
        <p className={styles.summary}>
          {messages.projectHealth.summary(passed, warnings, failed)}
        </p>
      ) : null}

      {directory ? (
        <ul className={styles.list}>
          {steps.map((step) => (
            <li key={step.id} className={styles.step}>
              <div className={styles.row}>
                <h3 className={styles.name}>
                  {messages.projectHealth.checks[step.id]}
                </h3>
                <Badge tone={statusTone[step.status]}>
                  {messages.projectHealth.status[step.status]}
                </Badge>
              </div>
              {step.output ? (
                <pre className={styles.terminal}>{step.output}</pre>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={confirming}
        tone="primary"
        title={messages.projectHealth.confirmTitle}
        description={messages.projectHealth.confirmDescription}
        confirmLabel={messages.projectHealth.run}
        cancelLabel={messages.common.cancel}
        onConfirm={() => void handleRun()}
        onCancel={() => setConfirming(false)}
      />
    </section>
  )
}
