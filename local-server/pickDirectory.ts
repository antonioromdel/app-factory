import { spawn } from 'node:child_process'
import { realpath, stat } from 'node:fs/promises'
import path from 'node:path'

export type PickDirectoryResult =
  | { ok: true; directory: string }
  | { ok: false; code: 'cancelled' | 'picker-failed' | 'picker-busy' }

const pickTimeoutMs = 10 * 60 * 1000

let picking = false

const pickerScript = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Elige la carpeta del proyecto Flutter'
$dialog.ShowNewFolderButton = $true
$dialog.UseDescriptionForTitle = $true
$start = $env:APP_FACTORY_FOLDER
if ($start -and (Test-Path -LiteralPath $start -PathType Container)) {
  $dialog.SelectedPath = $start
}
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
$result = $dialog.ShowDialog($owner)
$owner.Dispose()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.SelectedPath
}
`

export async function pickProjectDirectory(
  startDirectory: unknown,
): Promise<PickDirectoryResult> {
  if (process.platform !== 'win32') {
    return { ok: false, code: 'picker-failed' }
  }

  if (picking) {
    return { ok: false, code: 'picker-busy' }
  }

  picking = true
  try {
    const output = await showFolderDialog(
      await existingDirectory(startDirectory),
    )
    const selected = directoryFromOutput(output)
    if (!selected) {
      return { ok: false, code: 'cancelled' }
    }

    const directory = await realpath(selected)
    const directoryStat = await stat(directory)
    if (!directoryStat.isDirectory()) {
      return { ok: false, code: 'picker-failed' }
    }

    return { ok: true, directory }
  } catch {
    return { ok: false, code: 'picker-failed' }
  } finally {
    picking = false
  }
}

export function directoryFromOutput(stdout: string): string | undefined {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  return lines.at(-1)
}

function showFolderDialog(startDirectory: string | undefined): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-STA', '-Command', pickerScript],
      {
        windowsHide: false,
        env: {
          ...process.env,
          APP_FACTORY_FOLDER: startDirectory ?? '',
        },
      },
    )
    let output = ''
    let settled = false

    const finish = (error?: Error, value = ''): void => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      if (error) {
        reject(error)
        return
      }
      resolve(value)
    }

    const timer = setTimeout(() => {
      child.kill()
      finish(undefined, '')
    }, pickTimeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8')
    })
    child.on('error', (error) => {
      finish(error)
    })
    child.on('close', (status) => {
      if (status === 0) {
        finish(undefined, output)
        return
      }
      finish(new Error('picker'))
    })
  })
}

async function existingDirectory(value: unknown): Promise<string | undefined> {
  if (typeof value !== 'string') {
    return undefined
  }

  const candidate = value.trim()
  if (!candidate || candidate.length > 240 || !path.isAbsolute(candidate)) {
    return undefined
  }

  for (const character of candidate) {
    if (character.charCodeAt(0) < 32) {
      return undefined
    }
  }

  try {
    const directory = await realpath(candidate)
    const directoryStat = await stat(directory)
    return directoryStat.isDirectory() ? directory : undefined
  } catch {
    return undefined
  }
}
