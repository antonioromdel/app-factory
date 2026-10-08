import { useState, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  openLocalDirectory,
  type LocalFlutterErrorCode,
} from '@/services/localFlutterService.ts'

export function OpenFolderButton({
  directory,
}: {
  directory: string
}): ReactElement {
  const { messages } = useLanguage()
  const [opening, setOpening] = useState(false)
  const [errorCode, setErrorCode] = useState<LocalFlutterErrorCode | null>(null)

  async function handleOpen(): Promise<void> {
    setOpening(true)
    setErrorCode(null)
    const result = await openLocalDirectory(directory)
    setOpening(false)
    if (!result.ok) {
      setErrorCode(result.code)
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        disabled={opening}
        onClick={() => void handleOpen()}
      >
        {opening
          ? messages.flutterProject.opening
          : messages.flutterProject.openFolder}
      </Button>
      {errorCode ? (
        <ErrorState message={messages.flutterProject.errors[errorCode]} />
      ) : null}
    </>
  )
}
