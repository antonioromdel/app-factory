const localFlutterPort = 3847

export interface FlutterTemplateOption {
  id: string
  platforms: FlutterPlatformName[]
}

export const flutterPlatformNames = ['android', 'ios'] as const

export type FlutterPlatformName = (typeof flutterPlatformNames)[number]

export const localFlutterErrorCodes = [
  'invalid-request',
  'invalid-name',
  'invalid-org',
  'invalid-platforms',
  'invalid-template',
  'invalid-directory',
  'directory-missing',
  'project-exists',
  'flutter-missing',
  'flutter-failed',
  'timeout',
  'offline',
] as const

export type LocalFlutterErrorCode = (typeof localFlutterErrorCodes)[number]

export interface FlutterCreateInput {
  templateId: string
  projectName: string
  org: string
  platforms: FlutterPlatformName[]
  directory: string
  description?: string
}

export type FlutterCreateResponse =
  | { ok: true; projectPath: string; output: string }
  | { ok: false; code: LocalFlutterErrorCode; output?: string }

export function localFlutterUrl(): string {
  const configured = import.meta.env.VITE_LOCAL_API_URL
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim().replace(/\/$/, '')
  }

  return `http://127.0.0.1:${localFlutterPort}`
}

export async function fetchFlutterTemplates(
  signal: AbortSignal,
): Promise<FlutterTemplateOption[]> {
  const response = await fetch(`${localFlutterUrl()}/flutter/templates`, {
    signal,
  })
  if (!response.ok) {
    throw new Error('templates')
  }

  const payload: unknown = await response.json()
  if (!isRecord(payload) || !Array.isArray(payload.templates)) {
    throw new Error('templates')
  }

  return payload.templates.flatMap(readTemplate)
}

export async function createFlutterProject(
  input: FlutterCreateInput,
): Promise<FlutterCreateResponse> {
  let response: Response
  try {
    response = await fetch(`${localFlutterUrl()}/flutter/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
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

  return readCreateResponse(payload)
}

function readTemplate(value: unknown): FlutterTemplateOption[] {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return []
  }

  const requestedPlatforms = value.platforms
  if (!Array.isArray(requestedPlatforms)) {
    return []
  }

  const platforms = flutterPlatformNames.filter((platform) =>
    requestedPlatforms.some((item) => item === platform),
  )
  if (platforms.length === 0) {
    return []
  }

  return [{ id: value.id, platforms: [...platforms] }]
}

function readCreateResponse(value: unknown): FlutterCreateResponse {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return { ok: false, code: 'invalid-request' }
  }

  const output = typeof value.output === 'string' ? value.output : undefined
  if (value.ok && typeof value.projectPath === 'string') {
    return { ok: true, projectPath: value.projectPath, output: output ?? '' }
  }

  const code = localFlutterErrorCodes.find((item) => item === value.code)
  return { ok: false, code: code ?? 'flutter-failed', output }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
