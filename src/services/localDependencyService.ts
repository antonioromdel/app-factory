import { localFlutterUrl } from '@/services/localFlutterService.ts'

export const dependencyKinds = ['direct', 'dev', 'transitive'] as const

export type DependencyKind = (typeof dependencyKinds)[number]

export const dependencyFilters = [
  'managed',
  'direct',
  'dev',
  'transitive',
  'all',
] as const

export type DependencyFilter = (typeof dependencyFilters)[number]

export const dependencyErrorCodes = [
  'invalid-request',
  'invalid-directory',
  'directory-missing',
  'not-a-flutter-project',
  'invalid-package',
  'flutter-missing',
  'timeout',
  'read-failed',
  'upgrade-failed',
  'offline',
] as const

export type DependencyErrorCode = (typeof dependencyErrorCodes)[number]

export interface ProjectDependency {
  name: string
  kind: DependencyKind
  current: string | null
  latest: string | null
  purpose: string
  outdated: boolean
  discontinued: boolean
  updatable: boolean
}

export type DependencyFailure = {
  ok: false
  code: DependencyErrorCode
  output: string
}

export async function listProjectDependencies(
  directory: string,
): Promise<{ ok: true; packages: ProjectDependency[] } | DependencyFailure> {
  const result = await postDependency('/flutter/dependencies', {
    path: directory,
  })
  if (!result.ok) {
    return result
  }
  if (!('packages' in result)) {
    return { ok: false, code: 'invalid-request', output: '' }
  }
  return result
}

export async function upgradeProjectDependency(
  directory: string,
  packageName: string,
): Promise<{ ok: true; package: string } | DependencyFailure> {
  const result = await postDependency('/flutter/dependencies/upgrade', {
    path: directory,
    package: packageName,
  })
  if (!result.ok) {
    return result
  }
  if (!('package' in result)) {
    return { ok: false, code: 'invalid-request', output: '' }
  }
  return result
}

async function postDependency(
  pathname: string,
  body: { path: string; package?: string },
): Promise<
  | { ok: true; packages: ProjectDependency[] }
  | { ok: true; package: string }
  | DependencyFailure
> {
  let response: Response
  try {
    response = await fetch(`${localFlutterUrl()}${pathname}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return { ok: false, code: 'offline', output: '' }
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return { ok: false, code: 'offline', output: '' }
  }

  return readDependencyResponse(pathname, payload)
}

function readDependencyResponse(
  pathname: string,
  value: unknown,
):
  | { ok: true; packages: ProjectDependency[] }
  | { ok: true; package: string }
  | DependencyFailure {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return { ok: false, code: 'invalid-request', output: '' }
  }

  if (!value.ok) {
    const code = dependencyErrorCodes.find((item) => item === value.code)
    return {
      ok: false,
      code: code ?? 'invalid-request',
      output: typeof value.output === 'string' ? value.output : '',
    }
  }

  if (pathname.endsWith('/upgrade')) {
    if (typeof value.package !== 'string') {
      return { ok: false, code: 'invalid-request', output: '' }
    }
    return { ok: true, package: value.package }
  }

  if (!Array.isArray(value.packages)) {
    return { ok: false, code: 'invalid-request', output: '' }
  }

  const packages = value.packages.flatMap((item) => {
    const dependency = readPackage(item)
    return dependency ? [dependency] : []
  })
  return { ok: true, packages }
}

function readPackage(value: unknown): ProjectDependency | null {
  if (!isRecord(value) || typeof value.name !== 'string') {
    return null
  }
  const kind = dependencyKinds.find((item) => item === value.kind)
  if (!kind) {
    return null
  }
  return {
    name: value.name,
    kind,
    current: typeof value.current === 'string' ? value.current : null,
    latest: typeof value.latest === 'string' ? value.latest : null,
    purpose: typeof value.purpose === 'string' ? value.purpose : '',
    outdated: value.outdated === true,
    discontinued: value.discontinued === true,
    updatable: value.updatable === true,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
