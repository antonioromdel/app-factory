import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import {
  applicationIdFromReleasePath,
  formatReleaseDate,
  parseRelease,
  releaseFieldError,
  releaseInputFromFields,
  sortReleases,
  todayDateInput,
  upcomingReleases,
} from '@/features/releases/releaseRecord.ts'
import type { Release } from '@/types/release.ts'

const stamp = new Timestamp(1_700_000_000, 0)

function sample(overrides: Partial<Release> = {}): Release {
  return {
    id: 'rel',
    applicationId: 'app',
    version: '1.0.0',
    buildNumber: 1,
    date: '2026-01-01',
    platform: 'android',
    status: 'draft',
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  }
}

describe('release fields', () => {
  it('accepts a version, build and calendar date', () => {
    const draft = releaseInputFromFields({
      version: ' 1.2.0-beta.1 ',
      buildNumber: '42',
      date: '2026-10-10',
      platform: 'ios',
      status: 'testing',
      changes: '  Fixes login  ',
      notes: '   ',
    })

    expect(draft).toEqual({
      ok: true,
      input: {
        version: '1.2.0-beta.1',
        buildNumber: 42,
        date: '2026-10-10',
        platform: 'ios',
        status: 'testing',
        changes: 'Fixes login',
      },
    })
  })

  it('rejects an empty version, a padded build and an impossible date', () => {
    expect(
      releaseFieldError({ version: ' ', buildNumber: '2', date: '2026-01-01' }),
    ).toBe('version')
    expect(
      releaseFieldError({
        version: '1.0.0',
        buildNumber: '01',
        date: '2026-01-01',
      }),
    ).toBe('build')
    expect(
      releaseFieldError({
        version: '1.0.0',
        buildNumber: '2',
        date: '2026-02-31',
      }),
    ).toBe('date')
  })

  it('rejects a platform that is not android, ios or both', () => {
    expect(
      releaseInputFromFields({
        version: '1.0.0',
        buildNumber: '2',
        date: '2026-01-01',
        platform: 'web',
        status: 'draft',
        changes: '',
        notes: '',
      }),
    ).toEqual({ ok: false, field: 'invalid' })
  })
})

describe('release records', () => {
  it('reads a complete document and keeps optional text', () => {
    expect(
      parseRelease('rel', 'app', {
        version: '2.0.0',
        buildNumber: 8,
        date: '2026-03-01',
        platform: 'both',
        status: 'ready',
        changes: 'New editor',
        notes: 'Wait for review',
        createdAt: stamp,
        updatedAt: stamp,
      }),
    ).toMatchObject({
      id: 'rel',
      applicationId: 'app',
      version: '2.0.0',
      changes: 'New editor',
      notes: 'Wait for review',
    })
  })

  it('rejects a document without a status', () => {
    expect(() =>
      parseRelease('rel', 'app', {
        version: '2.0.0',
        buildNumber: 8,
        date: '2026-03-01',
        platform: 'both',
        createdAt: stamp,
        updatedAt: stamp,
      }),
    ).toThrow(/incomplete/)
  })

  it('reads the application id from the release path', () => {
    expect(applicationIdFromReleasePath('applications/abc/releases/def')).toBe(
      'abc',
    )
    expect(
      applicationIdFromReleasePath('applications/abc/assets/def'),
    ).toBeNull()
  })
})

describe('release order', () => {
  const releases = [
    sample({
      id: 'old',
      date: '2026-01-01',
      buildNumber: 2,
      status: 'released',
    }),
    sample({
      id: 'newer-build',
      date: '2026-05-01',
      buildNumber: 9,
      status: 'draft',
    }),
    sample({
      id: 'same-day',
      date: '2026-05-01',
      buildNumber: 4,
      status: 'testing',
    }),
    sample({ id: 'rejected', date: '2026-04-01', status: 'rejected' }),
    sample({ id: 'ready', date: '2026-06-01', status: 'ready' }),
  ]

  it('sorts newest date first and higher build numbers first', () => {
    expect(sortReleases(releases).map((release) => release.id)).toEqual([
      'ready',
      'newer-build',
      'same-day',
      'rejected',
      'old',
    ])
  })

  it('keeps only pending releases, soonest first', () => {
    expect(upcomingReleases(releases, 2).map((release) => release.id)).toEqual([
      'same-day',
      'newer-build',
    ])
  })
})

describe('release dates', () => {
  it('uses the local calendar day', () => {
    expect(todayDateInput(new Date(2026, 9, 10))).toBe('2026-10-10')
    expect(formatReleaseDate('2026-10-10', 'en')).toMatch(/Oct/)
    expect(formatReleaseDate('2026-10-10', 'en')).toMatch(/2026/)
    expect(formatReleaseDate('2026-02-31', 'en')).toBe('2026-02-31')
  })
})
