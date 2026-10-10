import { useEffect, useRef, useState } from 'react'
import {
  applicationInputFrom,
  mergeProjectProfile,
  releasePlatformOf,
  sameApplicationInput,
} from '@/features/flutter/projectProfile.ts'
import { todayDateInput } from '@/features/releases/releaseRecord.ts'
import {
  createRelease,
  listApplicationReleases,
} from '@/services/releaseService.ts'
import { updateApplication } from '@/services/applicationService.ts'
import {
  fetchProjectProfile,
  type ProjectProfileErrorCode,
} from '@/services/localProjectProfileService.ts'
import type { Application } from '@/types/application.ts'

export async function syncLinkedApplication(
  application: Application,
  directory: string,
): Promise<
  { ok: true; changed: boolean } | { ok: false; code: ProjectProfileErrorCode }
> {
  const profileResult = await fetchProjectProfile(directory)
  if (!profileResult.ok) {
    return profileResult
  }

  const input = mergeProjectProfile(
    application,
    profileResult.profile,
    directory,
  )
  let changed = !sameApplicationInput(input, applicationInputFrom(application))
  if (changed) {
    try {
      await updateApplication(application.id, input)
    } catch {
      return { ok: false, code: 'save' }
    }
  }

  const version = profileResult.profile.version
  const buildNumber = profileResult.profile.buildNumber
  if (!version || !buildNumber) {
    return { ok: true, changed }
  }

  try {
    const releases = await listApplicationReleases(application.id)
    const exists = releases.some(
      (release) =>
        release.version === version && release.buildNumber === buildNumber,
    )
    if (!exists) {
      await createRelease(application.id, {
        version,
        buildNumber: String(buildNumber),
        date: todayDateInput(),
        platform: releasePlatformOf(profileResult.profile),
        status: 'draft',
        changes: '',
        notes: '',
      })
      changed = true
    }
  } catch {
    return { ok: false, code: 'save' }
  }

  return { ok: true, changed }
}

export function useLinkedProjectSync(
  application: Application,
  onSaved: () => void,
): {
  syncing: boolean
  synced: boolean
  errorCode: ProjectProfileErrorCode | null
} {
  const directory = application.repository?.localPath?.trim() ?? ''
  const requestKey = `${application.id}:${directory}`
  const [outcome, setOutcome] = useState<{
    key: string
    synced: boolean
    errorCode: ProjectProfileErrorCode | null
  } | null>(null)
  const applicationRef = useRef(application)
  const onSavedRef = useRef(onSaved)

  useEffect(() => {
    applicationRef.current = application
    onSavedRef.current = onSaved
  })

  useEffect(() => {
    if (!directory) {
      return
    }

    let active = true
    syncLinkedApplication(applicationRef.current, directory)
      .then((result) => {
        if (!active) {
          return
        }
        setOutcome({
          key: requestKey,
          synced: result.ok && result.changed,
          errorCode: result.ok ? null : result.code,
        })
        if (result.ok && result.changed) {
          onSavedRef.current()
        }
      })
      .catch(() => {
        if (active) {
          setOutcome({ key: requestKey, synced: false, errorCode: 'save' })
        }
      })

    return () => {
      active = false
    }
  }, [application.id, directory, requestKey])

  return {
    syncing: directory !== '' && outcome?.key !== requestKey,
    synced: outcome?.key === requestKey && outcome.synced,
    errorCode: outcome?.key === requestKey ? outcome.errorCode : null,
  }
}
