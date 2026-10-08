const localFlutterPort = 3847

export interface FlutterFeatureOption {
  id: string
  packages: string[]
  requires: string[]
}

export interface FlutterTemplateOption {
  id: string
  platforms: FlutterPlatformName[]
  features: string[]
}

export interface FlutterTemplateCatalog {
  features: FlutterFeatureOption[]
  templates: FlutterTemplateOption[]
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
  'packages-failed',
  'invalid-features',
  'timeout',
  'offline',
  'picker-failed',
  'picker-busy',
  'open-failed',
] as const

export type LocalFlutterErrorCode = (typeof localFlutterErrorCodes)[number]

export interface FlutterCreateInput {
  templateId: string
  projectName: string
  org: string
  platforms: FlutterPlatformName[]
  directory: string
  features: string[]
  description?: string
}

export type FlutterCreateResponse =
  | { ok: true; projectPath: string; output: string }
  | {
      ok: false
      code: LocalFlutterErrorCode
      output?: string
      projectPath?: string
    }

export type PickDirectoryResponse =
  | { ok: true; directory: string }
  | { ok: false; code: 'cancelled' | LocalFlutterErrorCode }

export function localFlutterUrl(): string {
  const configured = import.meta.env.VITE_LOCAL_API_URL
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim().replace(/\/$/, '')
  }

  return `http://127.0.0.1:${localFlutterPort}`
}

export async function fetchFlutterTemplates(
  signal: AbortSignal,
): Promise<FlutterTemplateCatalog> {
  const response = await fetch(`${localFlutterUrl()}/flutter/templates`, {
    signal,
  })
  if (!response.ok) {
    throw new Error('templates')
  }

  const payload: unknown = await response.json()
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.features) ||
    !Array.isArray(payload.templates)
  ) {
    throw new Error('templates')
  }

  return {
    features: payload.features.flatMap(readFeature),
    templates: payload.templates.flatMap(readTemplate),
  }
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

export async function pickFlutterDirectory(
  directory: string,
): Promise<PickDirectoryResponse> {
  let response: Response
  try {
    response = await fetch(`${localFlutterUrl()}/flutter/pick-directory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory }),
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

  if (!isRecord(payload) || typeof payload.ok !== 'boolean') {
    return { ok: false, code: 'invalid-request' }
  }

  if (payload.ok && typeof payload.directory === 'string') {
    return { ok: true, directory: payload.directory }
  }

  if (payload.code === 'cancelled') {
    return { ok: false, code: 'cancelled' }
  }

  const code = localFlutterErrorCodes.find((item) => item === payload.code)
  return { ok: false, code: code ?? 'picker-failed' }
}

export async function openLocalDirectory(
  directory: string,
): Promise<{ ok: true } | { ok: false; code: LocalFlutterErrorCode }> {
  let response: Response
  try {
    response = await fetch(`${localFlutterUrl()}/filesystem/open`, {
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

  if (!isRecord(payload) || typeof payload.ok !== 'boolean') {
    return { ok: false, code: 'invalid-request' }
  }

  if (payload.ok) {
    return { ok: true }
  }

  const code = localFlutterErrorCodes.find((item) => item === payload.code)
  return { ok: false, code: code ?? 'open-failed' }
}

function readFeature(value: unknown): FlutterFeatureOption[] {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return []
  }

  if (!Array.isArray(value.packages) || !Array.isArray(value.requires)) {
    return []
  }

  const packages = value.packages.filter((item) => typeof item === 'string')
  const requires = value.requires.filter((item) => typeof item === 'string')
  if (
    packages.length !== value.packages.length ||
    requires.length !== value.requires.length
  ) {
    return []
  }

  return [{ id: value.id, packages, requires }]
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

  const featureIds = value.features
  if (!Array.isArray(featureIds)) {
    return []
  }

  const features = featureIds.filter((item) => typeof item === 'string')
  if (features.length !== featureIds.length) {
    return []
  }

  return [{ id: value.id, platforms: [...platforms], features }]
}

function readCreateResponse(value: unknown): FlutterCreateResponse {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return { ok: false, code: 'invalid-request' }
  }

  const output = typeof value.output === 'string' ? value.output : undefined
  if (value.ok && typeof value.projectPath === 'string') {
    return { ok: true, projectPath: value.projectPath, output: output ?? '' }
  }

  const projectPath =
    typeof value.projectPath === 'string' ? value.projectPath : undefined
  const code = localFlutterErrorCodes.find((item) => item === value.code)
  return { ok: false, code: code ?? 'flutter-failed', output, projectPath }
}

export function selectedPackages(
  features: FlutterFeatureOption[],
  templateFeatureIds: string[],
  selectedIds: string[],
): string[] {
  const allowed = new Set(templateFeatureIds)
  const included = new Set(selectedIds.filter((id) => allowed.has(id)))
  const byId = new Map(features.map((feature) => [feature.id, feature]))
  let pending = true

  while (pending) {
    pending = false
    for (const id of included) {
      const feature = byId.get(id)
      for (const required of feature?.requires ?? []) {
        if (!included.has(required) && byId.has(required)) {
          included.add(required)
          pending = true
        }
      }
    }
  }

  const packages: string[] = []
  for (const feature of features) {
    if (!included.has(feature.id)) {
      continue
    }
    for (const packageName of feature.packages) {
      if (!packages.includes(packageName)) {
        packages.push(packageName)
      }
    }
  }

  return packages
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
