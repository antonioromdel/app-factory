import { localFlutterUrl } from '@/services/localFlutterService.ts'

export const environmentToolIds = [
  'flutter',
  'dart',
  'git',
  'firebase',
  'node',
  'npm',
  'java',
  'androidSdk',
  'androidStudio',
  'xcode',
  'cocoapods',
  'fastlane',
] as const

export type EnvironmentToolId = (typeof environmentToolIds)[number]

export const environmentStatuses = ['installed', 'outdated', 'missing'] as const

export type EnvironmentStatus = (typeof environmentStatuses)[number]

export interface EnvironmentTool {
  id: EnvironmentToolId
  status: EnvironmentStatus
  version?: string
  detail?: string
}

export type EnvironmentResponse =
  | { ok: true; tools: EnvironmentTool[] }
  | { ok: false; code: 'offline' | 'invalid' }

export async function fetchEnvironment(
  signal: AbortSignal,
): Promise<EnvironmentResponse> {
  let response: Response
  try {
    response = await fetch(`${localFlutterUrl()}/environment`, { signal })
  } catch (error) {
    if (isAbort(error)) {
      throw error
    }
    return { ok: false, code: 'offline' }
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return { ok: false, code: 'invalid' }
  }

  if (!response.ok) {
    return { ok: false, code: 'invalid' }
  }

  return readEnvironment(payload)
}

function readEnvironment(value: unknown): EnvironmentResponse {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.tools)) {
    return { ok: false, code: 'invalid' }
  }

  const tools = value.tools.flatMap(readTool)
  if (tools.length === 0) {
    return { ok: false, code: 'invalid' }
  }

  return { ok: true, tools }
}

function readTool(value: unknown): EnvironmentTool[] {
  if (!isRecord(value)) {
    return []
  }

  const id = environmentToolIds.find((item) => item === value.id)
  const status = environmentStatuses.find((item) => item === value.status)
  if (!id || !status) {
    return []
  }

  const version = typeof value.version === 'string' ? value.version : undefined
  const detail = typeof value.detail === 'string' ? value.detail : undefined
  return [
    {
      id,
      status,
      ...(version ? { version } : {}),
      ...(detail ? { detail } : {}),
    },
  ]
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
