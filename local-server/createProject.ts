import { spawn } from 'node:child_process'
import { realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  findFlutterTemplate,
  type FlutterPlatform,
  type FlutterTemplate,
} from './templates.ts'

export const createProjectErrorCodes = [
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
] as const

export type CreateProjectErrorCode = (typeof createProjectErrorCodes)[number]

export interface FlutterCreatePlan {
  template: FlutterTemplate['template']
  projectName: string
  org: string
  platforms: FlutterPlatform[]
  directory: string
  projectPath: string
  description?: string
}

export type CreateProjectResult =
  | { ok: true; projectPath: string; output: string }
  | { ok: false; code: CreateProjectErrorCode; output?: string }

const projectNamePattern = /^[a-z][a-z0-9_]{0,63}$/
const orgPattern = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/
const dartKeywords = new Set([
  'abstract',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'covariant',
  'default',
  'deferred',
  'do',
  'dynamic',
  'else',
  'enum',
  'export',
  'extends',
  'extension',
  'external',
  'factory',
  'false',
  'final',
  'finally',
  'for',
  'function',
  'get',
  'hide',
  'if',
  'implements',
  'import',
  'in',
  'interface',
  'is',
  'late',
  'library',
  'mixin',
  'new',
  'null',
  'on',
  'operator',
  'part',
  'required',
  'rethrow',
  'return',
  'set',
  'show',
  'static',
  'super',
  'switch',
  'sync',
  'this',
  'throw',
  'true',
  'try',
  'typedef',
  'var',
  'void',
  'while',
  'with',
  'yield',
])

const outputLimit = 100_000
const createTimeoutMs = 180_000

export async function planFlutterCreate(
  body: unknown,
): Promise<
  | { ok: true; plan: FlutterCreatePlan }
  | { ok: false; code: CreateProjectErrorCode }
> {
  if (!isRecord(body)) {
    return { ok: false, code: 'invalid-request' }
  }

  const template = findFlutterTemplate(readString(body.templateId) ?? '')
  if (!template) {
    return { ok: false, code: 'invalid-template' }
  }

  const projectName = readString(body.projectName) ?? ''
  if (!projectNamePattern.test(projectName) || dartKeywords.has(projectName)) {
    return { ok: false, code: 'invalid-name' }
  }

  const org = readString(body.org) ?? ''
  if (!orgPattern.test(org) || org.length > 80) {
    return { ok: false, code: 'invalid-org' }
  }

  const requestedPlatforms = body.platforms
  if (!Array.isArray(requestedPlatforms)) {
    return { ok: false, code: 'invalid-platforms' }
  }

  const platforms = template.platforms.filter((platform) =>
    requestedPlatforms.some((item) => item === platform),
  )
  if (
    platforms.length === 0 ||
    requestedPlatforms.length !== platforms.length
  ) {
    return { ok: false, code: 'invalid-platforms' }
  }

  const directoryInput = readString(body.directory) ?? ''
  if (!isSafeDirectory(directoryInput)) {
    return { ok: false, code: 'invalid-directory' }
  }

  let directory: string
  try {
    directory = await realpath(path.resolve(directoryInput))
  } catch {
    return { ok: false, code: 'directory-missing' }
  }

  let directoryStat: Awaited<ReturnType<typeof stat>>
  try {
    directoryStat = await stat(directory)
  } catch {
    return { ok: false, code: 'directory-missing' }
  }

  if (!directoryStat.isDirectory()) {
    return { ok: false, code: 'invalid-directory' }
  }

  const projectPath = path.resolve(directory, projectName)
  const relative = path.relative(directory, projectPath)
  if (
    relative === '' ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    return { ok: false, code: 'invalid-directory' }
  }

  try {
    await stat(projectPath)
    return { ok: false, code: 'project-exists' }
  } catch {
    // The project folder is not there yet, so flutter create may use it.
  }

  const description = readDescription(body.description)

  return {
    ok: true,
    plan: {
      template: template.template,
      projectName,
      org,
      platforms: [...platforms],
      directory,
      projectPath,
      ...(description ? { description } : {}),
    },
  }
}

export function createFlutterProject(
  plan: FlutterCreatePlan,
): Promise<CreateProjectResult> {
  const args = [
    'create',
    '--template',
    plan.template,
    '--project-name',
    plan.projectName,
    '--org',
    plan.org,
    '--platforms',
    plan.platforms.join(','),
  ]

  if (plan.description) {
    args.push('--description', plan.description)
  }

  args.push(plan.projectPath)

  return new Promise((resolve) => {
    let settled = false
    let output = ''
    const child = startFlutter(args, plan.directory)

    const finish = (result: CreateProjectResult): void => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      resolve(result)
    }

    const timer = setTimeout(() => {
      child.kill()
      finish({ ok: false, code: 'timeout', output })
    }, createTimeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      output = appendOutput(output, chunk)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      output = appendOutput(output, chunk)
    })
    child.on('error', (error: NodeJS.ErrnoException) => {
      finish({
        ok: false,
        code: error.code === 'ENOENT' ? 'flutter-missing' : 'flutter-failed',
        output,
      })
    })
    child.on('close', (status) => {
      if (status === 0) {
        finish({ ok: true, projectPath: plan.projectPath, output })
        return
      }

      finish({
        ok: false,
        code: looksMissing(output) ? 'flutter-missing' : 'flutter-failed',
        output,
      })
    })
  })
}

function appendOutput(current: string, chunk: Buffer): string {
  const next = current + chunk.toString('utf8')
  if (next.length <= outputLimit) {
    return next
  }

  return next.slice(next.length - outputLimit)
}

function looksMissing(output: string): boolean {
  return /not recognized as an internal or external command|no se reconoce como un comando|command not found|No such file or directory/i.test(
    output,
  )
}

function startFlutter(args: string[], cwd: string) {
  if (process.platform !== 'win32') {
    return spawn('flutter', args, { windowsHide: true, cwd })
  }

  // flutter.bat cannot be started with CreateProcess. cmd.exe runs the fixed
  // command name, and each argument is quoted before it is joined.
  const commandLine = ['flutter', ...args.map(quoteForCmd)].join(' ')
  return spawn(
    process.env.ComSpec ?? 'cmd.exe',
    ['/d', '/s', '/c', commandLine],
    {
      windowsVerbatimArguments: true,
      windowsHide: true,
      cwd,
    },
  )
}

function quoteForCmd(value: string): string {
  if (!/[\s"]/.test(value)) {
    return value
  }

  return `"${value.replaceAll('"', '""')}"`
}

function isSafeDirectory(value: string): boolean {
  if (!value || value.length > 240 || !path.isAbsolute(value)) {
    return false
  }

  if (/[&|<>^%!"*?]/.test(value)) {
    return false
  }

  for (const character of value) {
    if (character.charCodeAt(0) < 32) {
      return false
    }
  }

  return true
}

function readDescription(value: unknown): string | undefined {
  const text = readString(value)
  if (!text) {
    return undefined
  }

  const clean = [...text]
    .map((character) =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
        ? ' '
        : character,
    )
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)

  return clean || undefined
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
