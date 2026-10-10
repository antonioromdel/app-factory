import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { runCommand } from '../commands/run.ts'
import { listProjectDependencies } from './dependencies.ts'
import { inspectFlutterProject, runHealthCheck } from './health.ts'

export const preparationActions = [
  'dependencies',
  'analyze',
  'test',
  'version',
  'buildNumber',
  'changelog',
  'android',
  'ios',
  'output',
] as const

export type PreparationAction = (typeof preparationActions)[number]

export type PreparationStatus = 'success' | 'warning' | 'failed'

export type PreparationReason =
  | 'unavailable'
  | 'empty-changes'
  | 'already-present'
  | 'nothing-to-validate'
  | 'missing-version'
  | 'write-failed'
  | 'timeout'
  | 'flutter-missing'
  | 'read-failed'

export type PreparationResult =
  | {
      ok: true
      status: PreparationStatus
      output: string
      reason?: PreparationReason
    }
  | {
      ok: false
      code:
        | 'invalid-directory'
        | 'directory-missing'
        | 'not-a-flutter-project'
        | 'invalid-release'
    }

const versionPattern = /^[0-9A-Za-z][0-9A-Za-z._-]{0,39}$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const fileLimit = 1_000_000
const buildTimeoutMs = 900_000
const pubGetTimeoutMs = 120_000

const versionLine =
  /^(version:\s*)(['"]?)([0-9A-Za-z][0-9A-Za-z._-]{0,39})(?:\+(\d+))?\2(.*)$/m

export interface ReleasePreparationInput {
  version: string
  buildNumber: number
  date: string
  changes: string
  targets: Array<'android' | 'ios'>
}

export function pubspecWithVersionName(
  source: string,
  version: string,
): string | null {
  if (!versionPattern.test(version)) {
    return null
  }
  return replaceVersionLine(source, (current) => ({
    version,
    build: current.build,
    comment: current.comment,
  }))
}

export function pubspecWithBuildNumber(
  source: string,
  buildNumber: number,
): string | null {
  if (!validBuildNumber(buildNumber)) {
    return null
  }
  return replaceVersionLine(source, (current) => ({
    version: current.version,
    build: String(buildNumber),
    comment: current.comment,
  }))
}

export function changelogWithRelease(
  existing: string,
  release: {
    version: string
    buildNumber: number
    date: string
    changes: string
  },
):
  | { status: 'success'; text: string }
  | {
      status: 'warning'
      reason: 'empty-changes' | 'already-present'
      text: string
    }
  | null {
  if (
    !versionPattern.test(release.version) ||
    !validBuildNumber(release.buildNumber) ||
    !datePattern.test(release.date)
  ) {
    return null
  }

  const heading = `## ${release.version}+${release.buildNumber} - ${release.date}`
  if (existing.split(/\r?\n/).some((line) => line.trim() === heading)) {
    return { status: 'warning', reason: 'already-present', text: existing }
  }

  const changes = release.changes.trim()
  if (!changes) {
    return { status: 'warning', reason: 'empty-changes', text: existing }
  }

  const bullets = changes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => (line.startsWith('- ') ? line : `- ${line}`))
    .join('\n')
  const section = `${heading}\n\n${bullets}\n`
  if (!existing.trim()) {
    return { status: 'success', text: section }
  }
  return {
    status: 'success',
    text: `${section}\n${existing.replace(/^\uFEFF/, '')}`,
  }
}

export async function runReleasePreparation(
  directoryValue: unknown,
  actionValue: unknown,
  input: ReleasePreparationInput,
): Promise<PreparationResult> {
  const action = preparationActions.find((item) => item === actionValue)
  if (!action) {
    return { ok: false, code: 'invalid-release' }
  }

  const project = await inspectFlutterProject(directoryValue)
  if (!project.ok) {
    return project
  }

  if (action === 'dependencies') {
    return checkDependencies(project.directory)
  }
  if (action === 'analyze' || action === 'test') {
    return healthStep(project.directory, action)
  }
  if (action === 'version') {
    return writePubspec(project.directory, (source) =>
      pubspecWithVersionName(source, input.version),
    )
  }
  if (action === 'buildNumber') {
    return writePubspec(project.directory, (source) =>
      pubspecWithBuildNumber(source, input.buildNumber),
    )
  }
  if (action === 'changelog') {
    return writeChangelog(project.directory, input)
  }
  if (action === 'android' || action === 'ios') {
    return buildTarget(project.directory, action)
  }
  return validateOutput(project.directory, input.targets)
}

export function readPreparationInput(
  value: unknown,
): ReleasePreparationInput | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const version =
    'version' in value && typeof value.version === 'string'
      ? value.version.trim()
      : ''
  const buildNumber =
    'buildNumber' in value && typeof value.buildNumber === 'number'
      ? value.buildNumber
      : Number.NaN
  const date =
    'date' in value && typeof value.date === 'string' ? value.date.trim() : ''
  const changes =
    'changes' in value && typeof value.changes === 'string' ? value.changes : ''
  const targets =
    'targets' in value && Array.isArray(value.targets) ? value.targets : []
  if (
    !versionPattern.test(version) ||
    !validBuildNumber(buildNumber) ||
    !datePattern.test(date) ||
    changes.length > 8_000
  ) {
    return null
  }
  const selected = targets.filter(
    (target): target is 'android' | 'ios' =>
      target === 'android' || target === 'ios',
  )
  return { version, buildNumber, date, changes, targets: selected }
}

function validBuildNumber(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 999_999_999
}

function replaceVersionLine(
  source: string,
  next: (current: { version: string; build: string; comment: string }) => {
    version: string
    build: string
    comment: string
  },
): string | null {
  const match = versionLine.exec(source)
  if (!match) {
    return null
  }
  const rawBuild = match[4]
  const buildNumber = rawBuild ? Number(rawBuild) : 1
  const current = {
    version: match[3] ?? '',
    build: validBuildNumber(buildNumber) ? String(buildNumber) : '1',
    comment: match[5] ?? '',
  }
  const replacement = next(current)
  const line = `version: ${replacement.version}+${replacement.build}${replacement.comment}`
  return (
    source.slice(0, match.index) +
    line +
    source.slice(match.index + match[0].length)
  )
}

export function declaredPubspecVersion(source: string): string | null {
  const match = versionLine.exec(source)
  const version = match?.[3]
  if (!version) {
    return null
  }
  return match[4] ? `${version}+${match[4]}` : version
}

export async function checkDependencies(
  directory: string,
): Promise<PreparationResult> {
  const fetched = await runCommand('flutter', ['pub', 'get'], {
    cwd: directory,
    timeoutMs: pubGetTimeoutMs,
  })
  if (!fetched.ok) {
    return commandFailure(fetched)
  }

  const listed = await listProjectDependencies(directory)
  if (!listed.ok) {
    if (
      listed.code === 'timeout' ||
      listed.code === 'flutter-missing' ||
      listed.code === 'read-failed'
    ) {
      return {
        ok: true,
        status: 'failed',
        output: fetched.output.trim(),
        reason: listed.code,
      }
    }
    return { ok: false, code: 'not-a-flutter-project' }
  }

  const outdated = listed.packages.filter(
    (item) =>
      (item.kind === 'direct' || item.kind === 'dev') &&
      (item.outdated || item.discontinued),
  )
  if (outdated.length === 0) {
    return { ok: true, status: 'success', output: '' }
  }
  return {
    ok: true,
    status: 'warning',
    output: outdated
      .map(
        (item) =>
          `${item.name} ${item.current ?? '-'} -> ${item.latest ?? '-'}`,
      )
      .join('\n'),
  }
}

async function healthStep(
  directory: string,
  check: 'analyze' | 'test',
): Promise<PreparationResult> {
  const result = await runHealthCheck(directory, check)
  if (!result.ok) {
    return {
      ok: false,
      code: result.code === 'invalid-check' ? 'invalid-release' : result.code,
    }
  }
  return {
    ok: true,
    status: result.status === 'passed' ? 'success' : result.status,
    output: result.output,
  }
}

async function writePubspec(
  directory: string,
  transform: (source: string) => string | null,
): Promise<PreparationResult> {
  const file = path.join(directory, 'pubspec.yaml')
  const source = await readText(file)
  if (source === null) {
    return { ok: true, status: 'failed', output: '', reason: 'write-failed' }
  }
  const next = transform(source)
  if (next === null) {
    return { ok: true, status: 'failed', output: '', reason: 'missing-version' }
  }
  try {
    await writeFile(file, next, 'utf8')
  } catch {
    return { ok: true, status: 'failed', output: '', reason: 'write-failed' }
  }
  const written = versionLine.exec(next)
  return { ok: true, status: 'success', output: written?.[0] ?? '' }
}

async function writeChangelog(
  directory: string,
  input: ReleasePreparationInput,
): Promise<PreparationResult> {
  const file = path.join(directory, 'CHANGELOG.md')
  const current = await readText(file)
  if (current === null && (await fileExists(file))) {
    return { ok: true, status: 'failed', output: '', reason: 'write-failed' }
  }

  const next = changelogWithRelease(current ?? '', input)
  if (!next) {
    return { ok: false, code: 'invalid-release' }
  }
  if (next.status === 'warning') {
    return { ok: true, status: 'warning', output: '', reason: next.reason }
  }
  try {
    await writeFile(file, next.text, 'utf8')
  } catch {
    return { ok: true, status: 'failed', output: '', reason: 'write-failed' }
  }
  return { ok: true, status: 'success', output: `CHANGELOG.md` }
}

async function buildTarget(
  directory: string,
  target: 'android' | 'ios',
): Promise<PreparationResult> {
  if (target === 'ios' && process.platform !== 'darwin') {
    return { ok: true, status: 'warning', output: '', reason: 'unavailable' }
  }

  const args =
    target === 'android'
      ? ['build', 'appbundle', '--release']
      : ['build', 'ipa', '--release']
  const result = await runCommand('flutter', args, {
    cwd: directory,
    timeoutMs: buildTimeoutMs,
  })
  if (result.ok) {
    return { ok: true, status: 'success', output: result.output.trim() }
  }
  return commandFailure(result)
}

async function validateOutput(
  directory: string,
  targets: Array<'android' | 'ios'>,
): Promise<PreparationResult> {
  if (targets.length === 0) {
    return {
      ok: true,
      status: 'warning',
      output: '',
      reason: 'nothing-to-validate',
    }
  }

  const lines: string[] = []
  let missing = false
  for (const target of targets) {
    const found = await artifacts(directory, target)
    if (found.length === 0) {
      missing = true
      lines.push(
        target === 'android'
          ? 'build/app/outputs/bundle/release/app-release.aab'
          : 'build/ios/ipa/*.ipa',
      )
      continue
    }
    lines.push(...found)
  }
  return {
    ok: true,
    status: missing ? 'failed' : 'success',
    output: lines.join('\n'),
  }
}

async function artifacts(
  directory: string,
  target: 'android' | 'ios',
): Promise<string[]> {
  if (target === 'android') {
    const relative = path.join(
      'build',
      'app',
      'outputs',
      'bundle',
      'release',
      'app-release.aab',
    )
    try {
      const info = await stat(path.join(directory, relative))
      return info.isFile() ? [relative] : []
    } catch {
      return []
    }
  }

  const folder = path.join(directory, 'build', 'ios', 'ipa')
  try {
    const entries = await readdir(folder, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ipa'))
      .map((entry) => path.join('build', 'ios', 'ipa', entry.name))
  } catch {
    return []
  }
}

function commandFailure(result: {
  code: 'missing' | 'failed' | 'timeout'
  output: string
}): PreparationResult {
  if (result.code === 'timeout') {
    return {
      ok: true,
      status: 'failed',
      output: result.output.trim(),
      reason: 'timeout',
    }
  }
  if (result.code === 'missing') {
    return {
      ok: true,
      status: 'failed',
      output: result.output.trim(),
      reason: 'flutter-missing',
    }
  }
  return { ok: true, status: 'failed', output: result.output.trim() }
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await stat(file)
    return true
  } catch {
    return false
  }
}

async function readText(file: string): Promise<string | null> {
  try {
    const info = await stat(file)
    if (!info.isFile() || info.size > fileLimit) {
      return null
    }
    return await readFile(file, 'utf8')
  } catch {
    return null
  }
}
