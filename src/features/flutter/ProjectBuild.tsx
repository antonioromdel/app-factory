import { useState, type ReactElement } from 'react'
import { Badge } from '@/components/Badge.tsx'
import { Button } from '@/components/Button.tsx'
import { ConfirmDialog } from '@/components/ConfirmDialog.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Select } from '@/components/Select.tsx'
import {
  buildPlatforms,
  productsForPlatform,
  runProjectBuildSteps,
  type BuildPlatform,
  type BuildProduct,
  type BuildStep,
  type BuildStepStatus,
} from '@/features/flutter/projectBuild.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  buildErrorCodes,
  runProjectBuildStep,
  type BuildErrorCode,
} from '@/services/localBuildService.ts'
import styles from './ProjectBuild.module.css'

const statusTone = {
  pending: 'neutral',
  running: 'info',
  success: 'success',
  warning: 'warning',
  failed: 'danger',
} as const satisfies Record<
  BuildStepStatus,
  'neutral' | 'info' | 'success' | 'warning' | 'danger'
>

export function ProjectBuild({
  directory,
}: {
  directory: string
}): ReactElement {
  const { messages } = useLanguage()
  const copy = messages.projectBuild
  const [platform, setPlatform] = useState<BuildPlatform>('android')
  const [product, setProduct] = useState<BuildProduct>('debug-apk')
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState<BuildStep[] | null>(null)
  const [errorCode, setErrorCode] = useState<BuildErrorCode | null>(null)

  async function handleBuild(): Promise<void> {
    setConfirming(false)
    setRunning(true)
    setErrorCode(null)
    const result = await runProjectBuildSteps(
      platform,
      (step, built) =>
        runProjectBuildStep(directory, platform, product, step, built),
      setSteps,
    )
    const code = buildErrorCodes.find((item) => item === result.errorCode)
    setErrorCode(code ?? (result.errorCode ? 'invalid-request' : null))
    setRunning(false)
  }

  function choosePlatform(value: string): void {
    if (!buildPlatforms.some((item) => item === value)) {
      return
    }
    const next = value as BuildPlatform
    setPlatform(next)
    const first = productsForPlatform(next)[0]
    if (first) {
      setProduct(first)
    }
    setSteps(null)
    setErrorCode(null)
  }

  function chooseProduct(value: string): void {
    const next = productsForPlatform(platform).find((item) => item === value)
    if (next) {
      setProduct(next)
      setSteps(null)
      setErrorCode(null)
    }
  }

  const finished = steps !== null && !running
  const succeeded =
    steps?.filter((step) => step.status === 'success').length ?? 0
  const warnings =
    steps?.filter((step) => step.status === 'warning').length ?? 0
  const failed = steps?.filter((step) => step.status === 'failed').length ?? 0

  return (
    <section className={styles.section}>
      <div className={styles.intro}>
        <h2 className={styles.title}>{copy.title}</h2>
        <p className={styles.lead}>{copy.lead}</p>
      </div>
      <div className={styles.controls}>
        <Select
          label={copy.platform}
          value={platform}
          disabled={running}
          options={buildPlatforms.map((item) => ({
            value: item,
            label: copy.platforms[item],
          }))}
          onChange={(event) => choosePlatform(event.target.value)}
        />
        <Select
          label={copy.product}
          value={product}
          disabled={running}
          options={productsForPlatform(platform).map((item) => ({
            value: item,
            label: copy.products[item],
          }))}
          onChange={(event) => chooseProduct(event.target.value)}
        />
      </div>
      <Button disabled={running} onClick={() => setConfirming(true)}>
        {running ? copy.running : copy.run}
      </Button>
      {errorCode ? <ErrorState message={copy.errors[errorCode]} /> : null}
      {finished && steps ? (
        <p className={styles.summary}>
          {copy.summary(succeeded, warnings, failed)}
        </p>
      ) : null}
      {steps ? (
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
      ) : null}
      <ConfirmDialog
        open={confirming}
        tone="primary"
        title={copy.confirmTitle}
        description={copy.confirmDescription(copy.products[product])}
        confirmLabel={copy.run}
        cancelLabel={messages.common.cancel}
        onConfirm={() => void handleBuild()}
        onCancel={() => setConfirming(false)}
      />
    </section>
  )
}
