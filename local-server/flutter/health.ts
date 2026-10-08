import { realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { runCommand } from '../commands/run.ts'
import { isSafeDirectory } from '../filesystem/paths.ts'

export const healthCheckIds = [
  'pubGet',
  'analyze',
  'test',
  'dependencies',
  'build',
] as const

export type HealthCheckId = (typeof healthCheckIds)[number]

export type HealthStatus = 'passed' | 'warning' | 'failed'

export type HealthCheckResult =
  | {
      ok: true
      id: HealthCheckId
      status: HealthStatus
      output: string
    }
  | {
      ok: false
      code:
        | 'invalid-directory'
        | 'directory-missing'
        | 'not-a-flutter-project'
        | 'invalid-check'
    }

const timeouts: Record<HealthCheckId, number> = {
  pubGet: 120_000,
  analyze: 180_000,
  test: 300_000,
  dependencies: 120_000,
  build: 180_000,
}

const args: Record<HealthCheckId, string[]> = {
  pubGet: ['pub', 'get'],
  analyze: ['analyze'],
  test: ['test'],
  dependencies: ['pub', 'outdated'],
  build: ['build', 'apk', '--config-only', '--no-pub'],
}

type ProjectDirectoryResult =
  | { ok: true; directory: string }
  | {
      ok: false
      code: 'invalid-directory' | 'directory-missing' | 'not-a-flutter-project'
    }

export async function runHealthCheck(
  directoryValue: unknown,
  checkValue: unknown,
): Promise<HealthCheckResult> {
  const check = healthCheckIds.find((id) => id === checkValue)
  if (!check) {
    return { ok: false, code: 'invalid-check' }
  }

  const project = await flutterProjectDirectory(directoryValue)
  if (!project.ok) {
    return project
  }

  const result = await runCommand('flutter', args[check], {
    cwd: project.directory,
    timeoutMs: timeouts[check],
  })
  const output = result.output.trim()
  return {
    ok: true,
    id: check,
    status: statusFor(check, result.ok, output),
    output,
  }
}

function statusFor(
  check: HealthCheckId,
  commandOk: boolean,
  output: string,
): HealthStatus {
  if (check === 'analyze') {
    if (/no issues found/i.test(output) && commandOk) {
      return 'passed'
    }
    if (commandOk && /issues found/i.test(output)) {
      return 'warning'
    }
    return 'failed'
  }

  if (check === 'test') {
    if (
      /no tests? (were )?found|no tests ran|test directory .* not found/i.test(
        output,
      )
    ) {
      return 'warning'
    }
    return commandOk ? 'passed' : 'failed'
  }

  if (check === 'dependencies') {
    if (!commandOk) {
      return 'failed'
    }
    if (/found no outdated packages/i.test(output)) {
      return 'passed'
    }
    return 'warning'
  }

  return commandOk ? 'passed' : 'failed'
}

async function flutterProjectDirectory(
  value: unknown,
): Promise<ProjectDirectoryResult> {
  const input = typeof value === 'string' ? value.trim() : ''
  if (!isSafeDirectory(input)) {
    return { ok: false, code: 'invalid-directory' }
  }

  let directory: string
  try {
    directory = await realpath(path.resolve(input))
  } catch {
    return { ok: false, code: 'directory-missing' }
  }

  if (!isSafeDirectory(directory)) {
    return { ok: false, code: 'invalid-directory' }
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

  try {
    const pubspec = await stat(path.join(directory, 'pubspec.yaml'))
    if (!pubspec.isFile()) {
      return { ok: false, code: 'not-a-flutter-project' }
    }
  } catch {
    return { ok: false, code: 'not-a-flutter-project' }
  }

  return { ok: true, directory }
}
