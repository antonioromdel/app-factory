import { spawn } from 'node:child_process'

export const commandPrograms = [
  'flutter',
  'dart',
  'git',
  'firebase',
  'node',
  'npm',
  'java',
  'fastlane',
  'xcodebuild',
  'pod',
  'powershell',
  'explorer',
  'open',
  'xdg-open',
] as const

export type CommandProgram = (typeof commandPrograms)[number]

export type CommandResult =
  | { ok: true; output: string }
  | { ok: false; code: 'missing' | 'failed' | 'timeout'; output: string }

const outputLimit = 100_000
const toolPrograms = new Set<CommandProgram>([
  'flutter',
  'dart',
  'git',
  'firebase',
  'node',
  'npm',
  'java',
  'fastlane',
  'xcodebuild',
  'pod',
])

export function runCommand(
  program: CommandProgram,
  args: string[],
  options: {
    cwd?: string
    timeoutMs?: number
    windowsHide?: boolean
    ignoreExitCode?: boolean
    env?: NodeJS.ProcessEnv
  } = {},
): Promise<CommandResult> {
  if (
    process.platform === 'win32' &&
    toolPrograms.has(program) &&
    args.some((arg) => arg.includes('\n') || arg.includes('\r'))
  ) {
    return Promise.resolve({ ok: false, code: 'failed', output: '' })
  }

  return new Promise((resolve) => {
    let settled = false
    let output = ''
    const child = startProgram(program, args, options)
    const timeoutMs = options.timeoutMs ?? 180_000

    const finish = (result: CommandResult): void => {
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
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      output = appendOutput(output, chunk)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      output = appendOutput(output, chunk)
    })
    child.on('error', (error: NodeJS.ErrnoException) => {
      finish({
        ok: false,
        code: error.code === 'ENOENT' ? 'missing' : 'failed',
        output,
      })
    })
    child.on('close', (status) => {
      if (status === 0 || options.ignoreExitCode) {
        finish({ ok: true, output })
        return
      }

      finish({
        ok: false,
        code: looksMissing(output) ? 'missing' : 'failed',
        output,
      })
    })
  })
}

function startProgram(
  program: CommandProgram,
  args: string[],
  options: {
    cwd?: string
    windowsHide?: boolean
    env?: NodeJS.ProcessEnv
  },
) {
  const windowsHide = options.windowsHide ?? true
  if (process.platform === 'win32' && toolPrograms.has(program)) {
    const commandLine = [program, ...args.map(quoteForCmd)].join(' ')
    return spawn(
      process.env.ComSpec ?? 'cmd.exe',
      ['/d', '/s', '/c', commandLine],
      {
        cwd: options.cwd,
        env: options.env,
        windowsVerbatimArguments: true,
        windowsHide,
      },
    )
  }

  const executable =
    program === 'powershell'
      ? 'powershell.exe'
      : program === 'explorer'
        ? 'explorer.exe'
        : program

  return spawn(executable, args, {
    cwd: options.cwd,
    env: options.env,
    windowsHide,
  })
}

function quoteForCmd(value: string): string {
  if (!/[\s"&|<>^%!]/.test(value)) {
    return value
  }

  return `"${value.replaceAll('%', '%%').replaceAll('"', '""')}"`
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
