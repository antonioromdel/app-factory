import type { Timestamp } from 'firebase/firestore'

export const releaseStatuses = [
  'draft',
  'testing',
  'ready',
  'released',
  'rejected',
] as const

export type ReleaseStatus = (typeof releaseStatuses)[number]

export const releasePlatforms = ['android', 'ios', 'both'] as const

export type ReleasePlatform = (typeof releasePlatforms)[number]

export const releaseFieldErrors = ['version', 'build', 'date'] as const

export type ReleaseFieldError = (typeof releaseFieldErrors)[number]

export interface Release {
  id: string
  applicationId: string
  version: string
  buildNumber: number
  date: string
  platform: ReleasePlatform
  changes?: string
  status: ReleaseStatus
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ReleaseInput {
  version: string
  buildNumber: number
  date: string
  platform: ReleasePlatform
  status: ReleaseStatus
  changes?: string
  notes?: string
}
