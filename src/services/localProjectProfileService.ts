import { localFlutterUrl } from '@/services/localFlutterService.ts'
import {
  projectProfileFromPayload,
  type ProjectProfile,
} from '@/features/flutter/projectProfile.ts'

export const projectProfileErrorCodes = [
  'invalid-request',
  'invalid-directory',
  'directory-missing',
  'not-a-flutter-project',
  'read-failed',
  'offline',
  'save',
] as const

export type ProjectProfileErrorCode = (typeof projectProfileErrorCodes)[number]

export async function fetchProjectProfile(
  directory: string,
): Promise<
  | { ok: true; profile: ProjectProfile }
  | { ok: false; code: ProjectProfileErrorCode }
> {
  let response: Response
  try {
    response = await fetch(`${localFlutterUrl()}/flutter/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: directory }),
    })
  } catch {
    return { ok: false, code: 'offline' }
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return { ok: false, code: 'offline' }
  }

  if (!isRecord(payload)) {
    return { ok: false, code: 'read-failed' }
  }
  if (payload.ok !== true) {
    const code = projectProfileErrorCodes.find((item) => item === payload.code)
    return { ok: false, code: code ?? 'read-failed' }
  }

  const profile = projectProfileFromPayload(payload.profile)
  if (!profile) {
    return { ok: false, code: 'read-failed' }
  }
  return { ok: true, profile }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
