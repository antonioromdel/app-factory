import { useEffect, useState, type ReactElement } from 'react'
import { Badge } from '@/components/Badge.tsx'
import { Button } from '@/components/Button.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  fetchEnvironment,
  type EnvironmentStatus,
  type EnvironmentTool,
} from '@/services/localEnvironmentService.ts'
import styles from './EnvironmentCheck.module.css'

const statusTone = {
  installed: 'success',
  outdated: 'warning',
  missing: 'danger',
} as const satisfies Record<EnvironmentStatus, 'success' | 'warning' | 'danger'>

export function EnvironmentCheck(): ReactElement {
  const { messages } = useLanguage()
  const [attempt, setAttempt] = useState(0)
  const [tools, setTools] = useState<EnvironmentTool[] | null>(null)
  const [errorCode, setErrorCode] = useState<'offline' | 'invalid' | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchEnvironment(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return
        }
        if (!result.ok) {
          setTools(null)
          setErrorCode(result.code)
          return
        }
        setErrorCode(null)
        setTools(result.tools)
      })
      .catch((error: unknown) => {
        if (isAbort(error) || controller.signal.aborted) {
          return
        }
        setTools(null)
        setErrorCode('offline')
      })

    return () => controller.abort()
  }, [attempt])

  const installed =
    tools?.filter((tool) => tool.status === 'installed').length ?? 0
  const outdated =
    tools?.filter((tool) => tool.status === 'outdated').length ?? 0
  const missing = tools?.filter((tool) => tool.status === 'missing').length ?? 0

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <p className={styles.lead}>{messages.environment.lead}</p>
        <Button
          variant="secondary"
          disabled={tools === null && errorCode === null}
          onClick={() => {
            setTools(null)
            setErrorCode(null)
            setAttempt((current) => current + 1)
          }}
        >
          {messages.environment.checkAgain}
        </Button>
      </div>

      {tools === null && errorCode === null ? (
        <LoadingState message={messages.environment.checking} />
      ) : null}
      {errorCode ? (
        <ErrorState
          message={messages.environment.errors[errorCode]}
          onRetry={() => {
            setTools(null)
            setErrorCode(null)
            setAttempt((current) => current + 1)
          }}
        />
      ) : null}
      {tools ? (
        <>
          <p className={styles.summary}>
            {messages.environment.summary(installed, outdated, missing)}
          </p>
          <ul className={styles.list}>
            {tools.map((tool) => (
              <li key={tool.id} className={styles.tool}>
                <div className={styles.row}>
                  <h2 className={styles.name}>
                    {messages.environment.tools[tool.id]}
                  </h2>
                  <Badge tone={statusTone[tool.status]}>
                    {messages.environment.status[tool.status]}
                  </Badge>
                </div>
                {tool.version ? (
                  <p className={styles.version}>{tool.version}</p>
                ) : null}
                {tool.detail ? (
                  <p className={styles.detail}>{tool.detail}</p>
                ) : null}
                {tool.status === 'missing' ? (
                  <p className={styles.hint}>
                    {messages.environment.missing[tool.id]}
                  </p>
                ) : null}
                {tool.status === 'outdated' ? (
                  <p className={styles.hint}>
                    {messages.environment.outdated[tool.id]}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
