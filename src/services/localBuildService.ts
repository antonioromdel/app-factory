import {
  buildReasons,
  type BuildPlatform,
  type BuildProduct,
  type BuildReason,
  type BuildStepId,
} from '@/features/flutter/projectBuild.ts'
import { localFlutterUrl } from '@/services/localFlutterService.ts'

export const buildErrorCodes = [
  'invalid-request',
  'invalid-directory',
  'directory-missing',
  'not-a-flutter-project',
  'invalid-build',
  'offline',
] as const

export type BuildErrorCode = (typeof buildErrorCodes)[number]

export type BuildStepResponse =
  | {
      ok: true
      status: 'success' | 'warning' | 'failed'
      output: string
      reason: BuildReason | null
    }
  | { ok: false; code: BuildErrorCode }

export async function runProjectBuildStep(
  directory: string,
  platform: BuildPlatform,
  product: BuildProduct,
  step: BuildStepId,
  built: boolean,
): Promise<BuildStepResponse> {
  let response: Response
  try {
    response = await fetch(`${localFlutterUrl()}/flutter/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: directory,
        platform,
        product,
        action: step,
        built,
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

  return readBuildResponse(payload)
}

function readBuildResponse(payload: unknown): BuildStepResponse {
  if (!isRecord(payload) || typeof payload.ok !== 'boolean') {
    return { ok: false, code: 'invalid-request' }
  }
  if (!payload.ok) {
    const code = buildErrorCodes.find((item) => item === payload.code)
    return { ok: false, code: code ?? 'invalid-request' }
  }
  if (
    payload.status !== 'success' &&
    payload.status !== 'warning' &&
    payload.status !== 'failed'
  ) {
    return { ok: false, code: 'invalid-request' }
  }
  const reason = buildReasons.find((item) => item === payload.reason) ?? null
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
