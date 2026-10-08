import { readdir, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { runCommand } from '../commands/run.ts'
import { isSafeDirectory } from '../filesystem/paths.ts'
import {
  findFlutterTemplate,
  resolveTemplatePackages,
  type FlutterPlatform,
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
  'packages-failed',
  'invalid-features',
  'timeout',
] as const

export type CreateProjectErrorCode = (typeof createProjectErrorCodes)[number]

export interface FlutterCreatePlan {
  projectName: string
  org: string
  platforms: FlutterPlatform[]
  directory: string
  projectPath: string
  packages: string[]
  description?: string
}

export type CreateProjectResult =
  | { ok: true; projectPath: string; output: string }
  | {
      ok: false
      code: CreateProjectErrorCode
      output?: string
      projectPath?: string
    }

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

  const requestedFeatures = body.features
  if (
    !Array.isArray(requestedFeatures) ||
    requestedFeatures.some((item) => typeof item !== 'string')
  ) {
    return { ok: false, code: 'invalid-features' }
  }

  const resolved = resolveTemplatePackages(template, requestedFeatures)
  if (!resolved.ok) {
    return resolved
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

  if (
    !directoryStat.isDirectory() ||
    path.parse(directory).root === directory
  ) {
    return { ok: false, code: 'invalid-directory' }
  }

  const entries = await readdir(directory)
  if (entries.length > 0) {
    return { ok: false, code: 'project-exists' }
  }

  const description = readDescription(body.description)

  return {
    ok: true,
    plan: {
      projectName,
      org,
      platforms: [...platforms],
      directory,
      projectPath: directory,
      packages: resolved.packages,
      ...(description ? { description } : {}),
    },
  }
}

export async function createFlutterProject(
  plan: FlutterCreatePlan,
): Promise<CreateProjectResult> {
  const args = [
    'create',
    '--template',
    'app',
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

  const created = await runFlutter(args, path.dirname(plan.projectPath))
  if (!created.ok || plan.packages.length === 0) {
    return created.ok
      ? { ok: true, projectPath: plan.projectPath, output: created.output }
      : created
  }

  const added = await runFlutter(
    ['pub', 'add', ...plan.packages],
    plan.projectPath,
  )
  const output = `${created.output}\n${added.output}`
  if (added.ok) {
    return { ok: true, projectPath: plan.projectPath, output }
  }

  return {
    ok: false,
    code:
      added.code === 'flutter-missing'
        ? 'flutter-missing'
        : added.code === 'timeout'
          ? 'timeout'
          : 'packages-failed',
    output,
    projectPath: plan.projectPath,
  }
}

async function runFlutter(
  args: string[],
  cwd: string,
): Promise<CreateProjectResult> {
  const result = await runCommand('flutter', args, {
    cwd,
    timeoutMs: createTimeoutMs,
  })
  if (result.ok) {
    return { ok: true, projectPath: cwd, output: result.output }
  }

  return {
    ok: false,
    code:
      result.code === 'missing'
        ? 'flutter-missing'
        : result.code === 'timeout'
          ? 'timeout'
          : 'flutter-failed',
    output: result.output,
  }
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
