import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  changelogWithRelease,
  pubspecWithBuildNumber,
  pubspecWithVersionName,
  readPreparationInput,
  runReleasePreparation,
} from './releasePreparation.ts'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe('pubspec version', () => {
  it('keeps the current build when the version name changes', () => {
    const next = pubspecWithVersionName(
      'name: demo\nversion: 1.0.0+8\n',
      '1.4.2',
    )
    expect(next).toBe('name: demo\nversion: 1.4.2+8\n')
  })

  it('writes the release build number', () => {
    const next = pubspecWithBuildNumber('name: demo\nversion: 1.4.2+8\n', 18)
    expect(next).toBe('name: demo\nversion: 1.4.2+18\n')
  })

  it('rejects a pubspec without a version line', () => {
    expect(pubspecWithVersionName('name: demo\n', '1.0.0')).toBeNull()
  })
})

describe('changelog', () => {
  it('prepends the release changes', () => {
    const next = changelogWithRelease('# Changelog\n', {
      version: '1.4.2',
      buildNumber: 18,
      date: '2026-10-10',
      changes: 'Fix the timer\n- Add a pause button',
    })
    expect(next).toEqual({
      status: 'success',
      text: '## 1.4.2+18 - 2026-10-10\n\n- Fix the timer\n- Add a pause button\n\n# Changelog\n',
    })
  })

  it('leaves the file alone when the release has no changes', () => {
    const next = changelogWithRelease('## 1.0.0+1 - 2026-01-01\n', {
      version: '1.4.2',
      buildNumber: 18,
      date: '2026-10-10',
      changes: '   ',
    })
    expect(next?.status).toBe('warning')
    if (next?.status === 'warning') {
      expect(next.reason).toBe('empty-changes')
    }
  })

  it('does not duplicate an existing heading', () => {
    const existing = '## 1.4.2+18 - 2026-10-10\n\n- Fix the timer\n'
    const next = changelogWithRelease(existing, {
      version: '1.4.2',
      buildNumber: 18,
      date: '2026-10-10',
      changes: 'Fix the timer',
    })
    expect(next).toEqual({
      status: 'warning',
      reason: 'already-present',
      text: existing,
    })
  })
})

describe('readPreparationInput', () => {
  it('accepts a release and ignores unknown targets', () => {
    expect(
      readPreparationInput({
        version: '1.4.2',
        buildNumber: 18,
        date: '2026-10-10',
        changes: 'Fix the timer',
        targets: ['android', 'web'],
      }),
    ).toEqual({
      version: '1.4.2',
      buildNumber: 18,
      date: '2026-10-10',
      changes: 'Fix the timer',
      targets: ['android'],
    })
  })
})

describe('runReleasePreparation', () => {
  it('writes the version and the changelog into the project', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'af-release-'))
    directories.push(directory)
    await writeFile(
      path.join(directory, 'pubspec.yaml'),
      'name: demo\nversion: 1.0.0+2\n',
      'utf8',
    )
    const input = {
      version: '1.4.2',
      buildNumber: 18,
      date: '2026-10-10',
      changes: 'Fix the timer',
      targets: [],
    }

    const version = await runReleasePreparation(directory, 'version', input)
    const build = await runReleasePreparation(directory, 'buildNumber', input)
    const changelog = await runReleasePreparation(directory, 'changelog', input)

    expect(version).toMatchObject({ ok: true, status: 'success' })
    expect(build).toMatchObject({ ok: true, status: 'success' })
    expect(changelog).toMatchObject({ ok: true, status: 'success' })
    expect(await readFile(path.join(directory, 'pubspec.yaml'), 'utf8')).toBe(
      'name: demo\nversion: 1.4.2+18\n',
    )
    expect(
      await readFile(path.join(directory, 'CHANGELOG.md'), 'utf8'),
    ).toContain('## 1.4.2+18 - 2026-10-10')
  })

  it('warns when this computer cannot build iOS', async () => {
    if (process.platform === 'darwin') {
      return
    }
    const directory = await mkdtemp(path.join(os.tmpdir(), 'af-release-'))
    directories.push(directory)
    await writeFile(
      path.join(directory, 'pubspec.yaml'),
      'name: demo\n',
      'utf8',
    )
    const result = await runReleasePreparation(directory, 'ios', {
      version: '1.0.0',
      buildNumber: 1,
      date: '2026-10-10',
      changes: '',
      targets: [],
    })
    expect(result).toEqual({
      ok: true,
      status: 'warning',
      output: '',
      reason: 'unavailable',
    })
  })
})
