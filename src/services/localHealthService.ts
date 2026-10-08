import { localFlutterUrl } from '@/services/localFlutterService.ts'

export const healthCheckIds = [
  'pubGet',
  'analyze',
  'test',
  'dependencies',
  'build',
] as const

export type HealthCheckId = (typeof healthCheckIds)[number]

export const healthStatuses = ['passed', 'warning', 'failed'] as const

export type HealthStatus = (typeof healthStatuses)[number]

export const healthErrorCodes = [
  'invalid-request',
  'invalid-directory',
  'directory-missing',
  'not-a-flutter-project',
  'invalid-check',
  'offline',
] as const

export type HealthErrorCode = (typeof healthErrorCodes)[number]

export type HealthCheckResponse =
  | { ok: true; id: HealthCheckId; status: HealthStatus; output: string }
  | { ok: false; code: HealthErrorCode }

export async function runProjectHealthCheck(
  directory: string,
  check: HealthCheckId,
): Promise<HealthCheckResponse> {
  let response: Response
  try {
    response = await fetch(`${localFlutterUrl()}/flutter/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: directory, check }),
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

  return readHealthResponse(payload)
}

function readHealthResponse(value: unknown): HealthCheckResponse {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return { ok: false, code: 'invalid-request' }
  }

  if (value.ok) {
    const id = healthCheckIds.find((item) => item === value.id)
    const status = healthStatuses.find((item) => item === value.status)
    if (!id || !status) {
      return { ok: false, code: 'invalid-request' }
    }
    return {
      ok: true,
      id,
      status,
      output: typeof value.output === 'string' ? value.output : '',
    }
  }

  const code = healthErrorCodes.find((item) => item === value.code)
  return { ok: false, code: code ?? 'invalid-request' }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
