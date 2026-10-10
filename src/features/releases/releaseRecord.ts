import { Timestamp } from 'firebase/firestore'
import {
  releasePlatforms,
  releaseStatuses,
  type Release,
  type ReleaseFieldError,
  type ReleaseInput,
  type ReleasePlatform,
  type ReleaseStatus,
} from '@/types/release.ts'

const versionPattern = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,39}$/
const buildPattern = /^[1-9]\d{0,8}$/
const textLimit = 4_000
const releasePathPattern = /^applications\/([^/]+)\/releases\/[^/]+$/

export class ReleaseRecordError extends Error {
  constructor() {
    super('incomplete')
    this.name = 'ReleaseRecordError'
  }
}

export function isReleaseStatus(value: string): value is ReleaseStatus {
  return releaseStatuses.some((status) => status === value)
}

export function isReleasePlatform(value: string): value is ReleasePlatform {
  return releasePlatforms.some((platform) => platform === value)
}

export function releaseFieldError(fields: {
  version: string
  buildNumber: string
  date: string
}): ReleaseFieldError | null {
  if (!versionPattern.test(fields.version.trim())) {
    return 'version'
  }
  if (!buildPattern.test(fields.buildNumber.trim())) {
    return 'build'
  }
  if (!isCalendarDate(fields.date.trim())) {
    return 'date'
  }
  return null
}

export function releaseInputFromFields(fields: {
  version: string
  buildNumber: string
  date: string
  platform: string
  status: string
  changes: string
  notes: string
}):
  | { ok: true; input: ReleaseInput }
  | { ok: false; field: ReleaseFieldError | 'invalid' } {
  const field = releaseFieldError(fields)
  if (field) {
    return { ok: false, field }
  }
  if (!isReleasePlatform(fields.platform) || !isReleaseStatus(fields.status)) {
    return { ok: false, field: 'invalid' }
  }

  const changes = optionalText(fields.changes)
  const notes = optionalText(fields.notes)
  if (changes === 'invalid' || notes === 'invalid') {
    return { ok: false, field: 'invalid' }
  }

  const input: ReleaseInput = {
    version: fields.version.trim(),
    buildNumber: Number(fields.buildNumber.trim()),
    date: fields.date.trim(),
    platform: fields.platform,
    status: fields.status,
  }
  if (changes) {
    input.changes = changes
  }
  if (notes) {
    input.notes = notes
  }
  return { ok: true, input }
}

export function parseRelease(
  id: string,
  applicationId: string,
  data: unknown,
): Release {
  if (!id || !applicationId || !isRecord(data)) {
    throw new ReleaseRecordError()
  }

  const version = readString(data.version)
  const date = readString(data.date)
  const platform = readString(data.platform)
  const status = readString(data.status)
  const buildNumber = data.buildNumber

  if (
    !version ||
    !versionPattern.test(version) ||
    typeof buildNumber !== 'number' ||
    !Number.isInteger(buildNumber) ||
    buildNumber < 1 ||
    !date ||
    !isCalendarDate(date) ||
    !platform ||
    !isReleasePlatform(platform) ||
    !status ||
    !isReleaseStatus(status) ||
    !(data.createdAt instanceof Timestamp) ||
    !(data.updatedAt instanceof Timestamp)
  ) {
    throw new ReleaseRecordError()
  }

  const changes = readString(data.changes)
  const notes = readString(data.notes)
  const release: Release = {
    id,
    applicationId,
    version,
    buildNumber,
    date,
    platform,
    status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
  if (changes) {
    release.changes = changes
  }
  if (notes) {
    release.notes = notes
  }
  return release
}

export function applicationIdFromReleasePath(path: string): string | null {
  return releasePathPattern.exec(path)?.[1] ?? null
}

export function compareReleases(left: Release, right: Release): number {
  const byDate = right.date.localeCompare(left.date)
  if (byDate !== 0) {
    return byDate
  }
  if (right.buildNumber !== left.buildNumber) {
    return right.buildNumber - left.buildNumber
  }
  return right.version.localeCompare(left.version)
}

export function sortReleases(releases: readonly Release[]): Release[] {
  return [...releases].sort(compareReleases)
}

export function upcomingReleases(
  releases: readonly Release[],
  limit = 5,
): Release[] {
  return releases
    .filter(
      (release) =>
        release.status === 'draft' ||
        release.status === 'testing' ||
        release.status === 'ready',
    )
    .sort((left, right) => {
      const byDate = left.date.localeCompare(right.date)
      if (byDate !== 0) {
        return byDate
      }
      return left.buildNumber - right.buildNumber
    })
    .slice(0, limit)
}

export function formatReleaseDate(value: string, language: string): string {
  if (!isCalendarDate(value)) {
    return value
  }
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(
    new Date(year ?? 0, (month ?? 1) - 1, day ?? 1),
  )
}

export function todayDateInput(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function optionalText(value: string): string | undefined | 'invalid' {
  const trimmed = value.trim()
  if (trimmed.length > textLimit) {
    return 'invalid'
  }
  return trimmed || undefined
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return false
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed || undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
