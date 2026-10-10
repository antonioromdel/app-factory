import {
  preparationReasons,
  type PreparationReason,
  type PreparationStepId,
} from '@/features/releases/releasePreparation.ts'
import { localFlutterUrl } from '@/services/localFlutterService.ts'

export const preparationErrorCodes = [
  'invalid-request',
  'invalid-directory',
  'directory-missing',
  'not-a-flutter-project',
  'invalid-release',
  'offline',
] as const

export type PreparationErrorCode = (typeof preparationErrorCodes)[number]

export type PreparationStepResponse =
  | {
      ok: true
      status: 'success' | 'warning' | 'failed'
      output: string
      reason: PreparationReason | null
    }
  | { ok: false; code: PreparationErrorCode }

export async function runReleasePreparationStep(
  directory: string,
  step: PreparationStepId,
  release: {
    version: string
    buildNumber: number
    date: string
    changes?: string
  },
  targets: Array<'android' | 'ios'>,
): Promise<PreparationStepResponse> {
  let response: Response
  try {
    response = await fetch(`${localFlutterUrl()}/flutter/release/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: directory,
        action: step,
        version: release.version,
        buildNumber: release.buildNumber,
        date: release.date,
        changes: release.changes ?? '',
        targets,
      }),
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

  return readPreparationResponse(payload)
}

function readPreparationResponse(payload: unknown): PreparationStepResponse {
  if (!isRecord(payload) || typeof payload.ok !== 'boolean') {
    return { ok: false, code: 'invalid-request' }
  }
  if (!payload.ok) {
    const code = preparationErrorCodes.find((item) => item === payload.code)
    return { ok: false, code: code ?? 'invalid-request' }
  }
  if (
    payload.status !== 'success' &&
    payload.status !== 'warning' &&
    payload.status !== 'failed'
  ) {
    return { ok: false, code: 'invalid-request' }
  }
  const reason =
    preparationReasons.find((item) => item === payload.reason) ?? null
  return {
    ok: true,
    status: payload.status,
    output: typeof payload.output === 'string' ? payload.output : '',
    reason,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
