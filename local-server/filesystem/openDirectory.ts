import { realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { runCommand, type CommandProgram } from '../commands/run.ts'
import { isSafeDirectory } from './paths.ts'

export type OpenDirectoryResult =
  | { ok: true }
  | {
      ok: false
      code: 'invalid-directory' | 'directory-missing' | 'open-failed'
    }

export async function openExistingDirectory(
  value: unknown,
): Promise<OpenDirectoryResult> {
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

  const program = folderProgram()
  if (!program) {
    return { ok: false, code: 'open-failed' }
  }

  const result = await runCommand(program, [directory], {
    timeoutMs: 15_000,
    ignoreExitCode: program === 'explorer',
  })
  if (!result.ok) {
    return { ok: false, code: 'open-failed' }
  }

  return { ok: true }
}

function folderProgram(): CommandProgram | undefined {
  if (process.platform === 'win32') {
    return 'explorer'
  }

  if (process.platform === 'darwin') {
    return 'open'
  }

  if (process.platform === 'linux') {
    return 'xdg-open'
  }

  return undefined
}
