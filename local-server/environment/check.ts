import { access, readdir, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runCommand, type CommandProgram } from '../commands/run.ts'

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

export type EnvironmentStatus = 'installed' | 'outdated' | 'missing'

export interface EnvironmentTool {
  id: EnvironmentToolId
  status: EnvironmentStatus
  version?: string
  detail?: string
}

const minimumVersions: Partial<Record<EnvironmentToolId, string>> = {
  flutter: '3.24.0',
  dart: '3.5.0',
  git: '2.40.0',
  firebase: '13.0.0',
  node: '20.0.0',
  npm: '10.0.0',
  java: '17.0.0',
  fastlane: '2.219.0',
  cocoapods: '1.14.0',
  xcode: '15.0.0',
}

const minimumAndroidApi = 34

interface CommandCheck {
  id: EnvironmentToolId
  program: CommandProgram
  args: string[]
  timeoutMs: number
  pattern: RegExp
  notice?: RegExp
  normalize?: (version: string) => string
}

const commandChecks: CommandCheck[] = [
  {
    id: 'flutter',
    program: 'flutter',
    args: ['--version'],
    timeoutMs: 45_000,
    pattern: /Flutter (\d+\.\d+\.\d+)/,
    notice: /a new version of flutter is available/i,
  },
  {
    id: 'dart',
    program: 'dart',
    args: ['--version'],
    timeoutMs: 45_000,
    pattern: /Dart SDK version: (\d+\.\d+\.\d+)/,
  },
  {
    id: 'git',
    program: 'git',
    args: ['--version'],
    timeoutMs: 15_000,
    pattern: /git version (\d+\.\d+\.\d+)/,
  },
  {
    id: 'firebase',
    program: 'firebase',
    args: ['--version'],
    timeoutMs: 60_000,
    pattern: /(\d+\.\d+\.\d+)/,
  },
  {
    id: 'node',
    program: 'node',
    args: ['--version'],
    timeoutMs: 15_000,
    pattern: /v?(\d+\.\d+\.\d+)/,
  },
  {
    id: 'npm',
    program: 'npm',
    args: ['--version'],
    timeoutMs: 20_000,
    pattern: /(\d+\.\d+\.\d+)/,
  },
  {
    id: 'java',
    program: 'java',
    args: ['-version'],
    timeoutMs: 15_000,
    pattern: /version "([^"]+)"/,
    normalize: normalizeJava,
  },
  {
    id: 'fastlane',
    program: 'fastlane',
    args: ['--version'],
    timeoutMs: 45_000,
    pattern: /fastlane (\d+\.\d+\.\d+)/,
  },
]

export async function checkEnvironment(): Promise<{
  ok: true
  tools: EnvironmentTool[]
}> {
  const tools = await Promise.all([
    ...commandChecks.map((check) => checkCommand(check)),
    checkAndroidSdk(),
    checkAndroidStudio(),
    ...platformChecks(),
  ])

  const byId = new Map(tools.map((tool) => [tool.id, tool]))
  return {
    ok: true,
    tools: environmentToolIds.flatMap((id) => {
      const tool = byId.get(id)
      return tool ? [tool] : []
    }),
  }
}

function platformChecks(): Array<Promise<EnvironmentTool>> {
  if (process.platform !== 'darwin') {
    return []
  }

  return [
    checkCommand({
      id: 'xcode',
      program: 'xcodebuild',
      args: ['-version'],
      timeoutMs: 20_000,
      pattern: /Xcode (\d+\.\d+(?:\.\d+)?)/,
    }),
    checkCommand({
      id: 'cocoapods',
      program: 'pod',
      args: ['--version'],
      timeoutMs: 20_000,
      pattern: /(\d+\.\d+\.\d+)/,
    }),
  ]
}

async function checkCommand(check: CommandCheck): Promise<EnvironmentTool> {
  const result = await runCommand(check.program, check.args, {
    timeoutMs: check.timeoutMs,
  })
  const raw = check.pattern.exec(result.output)?.[1]
  const version = raw ? (check.normalize?.(raw) ?? raw) : undefined
  if (!version) {
    return { id: check.id, status: 'missing' }
  }

  const minimum = minimumVersions[check.id]
  const belowMinimum = minimum ? compareVersions(version, minimum) < 0 : false
  const updateNotice = check.notice?.test(result.output) ?? false
  return {
    id: check.id,
    status: belowMinimum || updateNotice ? 'outdated' : 'installed',
    version,
  }
}

async function checkAndroidSdk(): Promise<EnvironmentTool> {
  const directory = await firstExisting(sdkCandidates(), 'platform-tools')
  if (!directory) {
    return { id: 'androidSdk', status: 'missing' }
  }

  const api = await highestAndroidApi(directory)
  return {
    id: 'androidSdk',
    status:
      api !== undefined && api < minimumAndroidApi ? 'outdated' : 'installed',
    ...(api !== undefined ? { version: `API ${api}` } : {}),
    detail: directory,
  }
}

async function checkAndroidStudio(): Promise<EnvironmentTool> {
  const directory = await firstExisting(studioCandidates())
  if (!directory) {
    return { id: 'androidStudio', status: 'missing' }
  }

  const version = await readStudioVersion(directory)
  return {
    id: 'androidStudio',
    status: 'installed',
    ...(version ? { version } : {}),
    detail: directory,
  }
}

function sdkCandidates(): string[] {
  const home = os.homedir()
  const fromEnv = [envPath('ANDROID_HOME'), envPath('ANDROID_SDK_ROOT')]
  if (process.platform === 'win32') {
    const local = envPath('LOCALAPPDATA')
    return [
      ...fromEnv,
      local ? path.join(local, 'Android', 'Sdk') : undefined,
    ].filter((item): item is string => Boolean(item))
  }

  if (process.platform === 'darwin') {
    return [...fromEnv, path.join(home, 'Library', 'Android', 'sdk')].filter(
      (item): item is string => Boolean(item),
    )
  }

  return [...fromEnv, path.join(home, 'Android', 'Sdk')].filter(
    (item): item is string => Boolean(item),
  )
}

function studioCandidates(): string[] {
  const home = os.homedir()
  if (process.platform === 'win32') {
    const programFiles = envPath('ProgramFiles')
    const local = envPath('LOCALAPPDATA')
    return [
      programFiles
        ? path.join(programFiles, 'Android', 'Android Studio')
        : undefined,
      local ? path.join(local, 'Programs', 'Android Studio') : undefined,
    ].filter((item): item is string => Boolean(item))
  }

  if (process.platform === 'darwin') {
    return [path.join('/Applications', 'Android Studio.app')]
  }

  return ['/opt/android-studio', path.join(home, 'android-studio')]
}

async function firstExisting(
  candidates: string[],
  child?: string,
): Promise<string | undefined> {
  for (const candidate of candidates) {
    const target = child ? path.join(candidate, child) : candidate
    if (await pathExists(target)) {
      return candidate
    }
  }

  return undefined
}

async function highestAndroidApi(
  directory: string,
): Promise<number | undefined> {
  try {
    const names = await readdir(path.join(directory, 'platforms'))
    const apis = names.flatMap((name) => {
      const match = /^android-(\d+)$/.exec(name)
      return match ? [Number(match[1])] : []
    })
    if (apis.length === 0) {
      return undefined
    }

    return Math.max(...apis)
  } catch {
    return undefined
  }
}

async function readStudioVersion(
  directory: string,
): Promise<string | undefined> {
  const files = [
    path.join(directory, 'product-info.json'),
    path.join(directory, 'Contents', 'Resources', 'product-info.json'),
  ]
  for (const file of files) {
    try {
      const parsed: unknown = JSON.parse(await readFile(file, 'utf8'))
      const version = studioVersion(parsed)
      if (version) {
        return version
      }
    } catch {
      continue
    }
  }

  return undefined
}

function studioVersion(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  if (typeof value.dataDirectoryName === 'string') {
    const match = /AndroidStudio(\d+\.\d+(?:\.\d+)?)/.exec(
      value.dataDirectoryName,
    )
    if (match) {
      return match[1]
    }
  }

  if (typeof value.version === 'string' && !value.version.startsWith('AI-')) {
    return value.version
  }

  return undefined
}

function normalizeJava(version: string): string {
  const parts = version
    .split(/[._]/)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => !Number.isNaN(part))
  if (parts[0] === 1 && parts.length > 1) {
    return `${parts[1]}.${parts[2] ?? 0}.${parts[3] ?? 0}`
  }

  return `${parts[0] ?? 0}.${parts[1] ?? 0}.${parts[2] ?? 0}`
}

function compareVersions(left: string, right: string): number {
  const a = left.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const b = right.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0)
    if (difference !== 0) {
      return difference
    }
  }

  return 0
}

function envPath(name: string): string | undefined {
  const value = process.env[name]?.trim().replace(/^"|"$/g, '')
  return value || undefined
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
