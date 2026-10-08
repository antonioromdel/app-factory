import { readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runCommand } from '../commands/run.ts'
import { inspectFlutterProject } from './health.ts'

export const dependencyKinds = ['direct', 'dev', 'transitive'] as const

export type DependencyKind = (typeof dependencyKinds)[number]

export type DependencyErrorCode =
  | 'invalid-directory'
  | 'directory-missing'
  | 'not-a-flutter-project'
  | 'invalid-package'
  | 'flutter-missing'
  | 'timeout'
  | 'read-failed'
  | 'upgrade-failed'

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

export type DependencyListResult =
  | { ok: true; packages: ProjectDependency[] }
  | { ok: false; code: DependencyErrorCode }

export type DependencyUpgradeResult =
  | { ok: true; package: string }
  | { ok: false; code: DependencyErrorCode; output: string }

const commandTimeoutMs = 180_000
const packageNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/

export async function listProjectDependencies(
  directoryValue: unknown,
): Promise<DependencyListResult> {
  const project = await inspectFlutterProject(directoryValue)
  if (!project.ok) {
    return project
  }

  const result = await runCommand(
    'flutter',
    ['pub', 'outdated', '--json', '--show-all'],
    {
      cwd: project.directory,
      timeoutMs: commandTimeoutMs,
    },
  )
  if (!result.ok && result.code === 'timeout') {
    return { ok: false, code: 'timeout' }
  }
  if (!result.ok && result.code === 'missing') {
    return { ok: false, code: 'flutter-missing' }
  }

  // pub outdated exits with 1 when any package is outdated, even if the JSON is valid.
  const parsed = extractJson(result.output)
  const rows = dependencyRows(parsed)
  if (!rows) {
    return { ok: false, code: 'read-failed' }
  }

  const declared = await declaredPackageNames(project.directory)
  const packages: ProjectDependency[] = []
  for (const row of rows) {
    const item = readDependency(row, declared)
    if (item) {
      packages.push(item)
    }
  }

  await Promise.all(
    packages.map(async (item) => {
      item.purpose = await readPurpose(item.name, item.current)
    }),
  )

  packages.sort(comparePackages)
  return { ok: true, packages }
}

export async function upgradeProjectDependency(
  directoryValue: unknown,
  packageValue: unknown,
): Promise<DependencyUpgradeResult> {
  const project = await inspectFlutterProject(directoryValue)
  if (!project.ok) {
    return { ...project, output: '' }
  }

  const packageName =
    typeof packageValue === 'string' ? packageValue.trim() : ''
  if (!packageNamePattern.test(packageName)) {
    return { ok: false, code: 'invalid-package', output: '' }
  }

  const declared = await declaredPackageNames(project.directory)
  if (!declared.has(packageName)) {
    return { ok: false, code: 'invalid-package', output: '' }
  }

  const result = await runCommand(
    'flutter',
    ['pub', 'upgrade', '--major-versions', packageName],
    { cwd: project.directory, timeoutMs: commandTimeoutMs },
  )
  if (result.ok) {
    return { ok: true, package: packageName }
  }
  if (result.code === 'timeout') {
    return { ok: false, code: 'timeout', output: clipOutput(result.output) }
  }
  if (result.code === 'missing') {
    return { ok: false, code: 'flutter-missing', output: '' }
  }
  return {
    ok: false,
    code: 'upgrade-failed',
    output: clipOutput(result.output),
  }
}

function dependencyRows(value: unknown): unknown[] | null {
  if (!isRecord(value)) {
    return null
  }
  if (Array.isArray(value.packages)) {
    return value.packages
  }
  if (Array.isArray(value.dependencies)) {
    return value.dependencies
  }
  return null
}

function readDependency(
  value: unknown,
  declared: Set<string>,
): ProjectDependency | null {
  if (!isRecord(value) || typeof value.package !== 'string') {
    return null
  }
  if (!packageNamePattern.test(value.package)) {
    return null
  }

  const current = readVersion(value.current)
  const latest = readVersion(value.latest)
  const outdated =
    current !== null && latest !== null && compareVersions(current, latest) < 0
  const kind = readKind(value.kind)

  return {
    name: value.package,
    kind,
    current,
    latest,
    purpose: '',
    outdated,
    discontinued: value.isDiscontinued === true,
    updatable: outdated && declared.has(value.package),
  }
}

function readKind(value: unknown): DependencyKind {
  if (value === 'dev' || value === 'transitive') {
    return value
  }
  return 'direct'
}

function readVersion(value: unknown): string | null {
  if (!isRecord(value) || typeof value.version !== 'string') {
    return null
  }
  const version = value.version.trim()
  return version || null
}

async function declaredPackageNames(directory: string): Promise<Set<string>> {
  let text: string
  try {
    text = await readFile(path.join(directory, 'pubspec.yaml'), 'utf8')
  } catch {
    return new Set()
  }

  const names = new Set<string>()
  let section: 'dependencies' | 'dev_dependencies' | null = null
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*#/.test(line) || line.trim() === '') {
      continue
    }
    if (/^[^\s]/.test(line)) {
      if (line.startsWith('dependencies:')) {
        section = 'dependencies'
      } else if (line.startsWith('dev_dependencies:')) {
        section = 'dev_dependencies'
      } else {
        section = null
      }
      continue
    }
    if (!section) {
      continue
    }
    const match = /^ {2}([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(line)
    if (!match) {
      continue
    }
    const name = match[1]
    if (name && name !== 'flutter' && name !== 'flutter_test') {
      names.add(name)
    }
  }
  return names
}

async function readPurpose(
  name: string,
  version: string | null,
): Promise<string> {
  if (!version) {
    return ''
  }

  const cache = pubCacheDirectory()
  const hosts = ['pub.dev', 'pub.dartlang.org']
  for (const host of hosts) {
    const pubspecPath = path.join(
      cache,
      'hosted',
      host,
      `${name}-${version}`,
      'pubspec.yaml',
    )
    try {
      const text = await readFile(pubspecPath, 'utf8')
      return clipPurpose(readDescription(text))
    } catch {
      continue
    }
  }
  return ''
}

function pubCacheDirectory(): string {
  const configured = process.env.PUB_CACHE?.trim()
  if (configured) {
    return configured
  }
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, 'Pub', 'Cache')
  }
  return path.join(os.homedir(), '.pub-cache')
}

function readDescription(pubspec: string): string {
  const lines = pubspec.split(/\r?\n/)
  const index = lines.findIndex((line) => /^description:/.test(line))
  if (index < 0) {
    return ''
  }

  const line = lines[index] ?? ''
  const inline = line.slice('description:'.length).trim()
  if (
    inline &&
    inline !== '|' &&
    inline !== '>' &&
    inline !== '>-' &&
    inline !== '|-'
  ) {
    return unquote(inline)
  }

  const collected: string[] = []
  for (const next of lines.slice(index + 1)) {
    if (!next.startsWith(' ') && !next.startsWith('\t')) {
      break
    }
    collected.push(next.trim())
  }
  return collected.join(' ')
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function clipPurpose(value: string): string {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= 240) {
    return trimmed
  }
  return `${trimmed.slice(0, 237)}…`
}

function clipOutput(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length <= 4_000) {
    return trimmed
  }
  return trimmed.slice(trimmed.length - 4_000)
}

function comparePackages(
  left: ProjectDependency,
  right: ProjectDependency,
): number {
  const kindOrder: Record<DependencyKind, number> = {
    direct: 0,
    dev: 1,
    transitive: 2,
  }
  const byKind = kindOrder[left.kind] - kindOrder[right.kind]
  if (byKind !== 0) {
    return byKind
  }
  if (left.outdated !== right.outdated) {
    return left.outdated ? -1 : 1
  }
  return left.name.localeCompare(right.name)
}

function compareVersions(left: string, right: string): number {
  const a = splitVersion(left)
  const b = splitVersion(right)
  const length = Math.max(a.numbers.length, b.numbers.length)
  for (let index = 0; index < length; index += 1) {
    const difference = (a.numbers[index] ?? 0) - (b.numbers[index] ?? 0)
    if (difference !== 0) {
      return difference < 0 ? -1 : 1
    }
  }
  if (a.pre === b.pre) {
    return 0
  }
  if (a.pre === null) {
    return 1
  }
  if (b.pre === null) {
    return -1
  }
  return a.pre < b.pre ? -1 : 1
}

function splitVersion(value: string): {
  numbers: number[]
  pre: string | null
} {
  const [core, pre] = value.split('-', 2)
  const numbers = (core ?? '').split('.').map((part) => {
    const digits = /^(\d+)/.exec(part)
    return digits ? Number(digits[1]) : 0
  })
  return { numbers, pre: pre ?? null }
}

function extractJson(output: string): unknown {
  const start = output.indexOf('{')
  const end = output.lastIndexOf('}')
  if (start < 0 || end <= start) {
    return null
  }
  try {
    return JSON.parse(output.slice(start, end + 1))
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
