import {
  applicationStatuses,
  type Application,
  type ApplicationStatus,
} from '@/types/application.ts'

const statusLabels: Record<ApplicationStatus, string> = {
  IDEA: 'Idea',
  PLANNING: 'Planning',
  SETUP: 'Setup',
  DEVELOPMENT: 'Development',
  TESTING: 'Testing',
  BETA: 'Beta',
  RELEASE: 'Release',
  PUBLISHED: 'Published',
  MAINTENANCE: 'Maintenance',
  ARCHIVED: 'Archived',
}

export function statusLabel(status: ApplicationStatus): string {
  return statusLabels[status]
}

export function statusTone(
  status: ApplicationStatus,
): 'neutral' | 'success' | 'warning' {
  if (status === 'PUBLISHED') {
    return 'success'
  }

  if (status === 'RELEASE' || status === 'BETA') {
    return 'warning'
  }

  return 'neutral'
}

export function platformLabel(application: Application): string {
  const platforms: string[] = []
  if (application.flutter?.packageName) {
    platforms.push('Android')
  }
  if (application.flutter?.bundleId) {
    platforms.push('iOS')
  }

  return platforms.length > 0 ? platforms.join(', ') : '—'
}

export function versionLabel(application: Application): string {
  return (
    application.googlePlay?.currentVersion ??
    application.appStore?.currentVersion ??
    '—'
  )
}

export function updatedLabel(application: Application): string {
  return application.updatedAt.toDate().toLocaleDateString(undefined, {
    dateStyle: 'medium',
  })
}

export function statusRank(status: ApplicationStatus | undefined): number {
  if (!status) {
    return applicationStatuses.length
  }

  return applicationStatuses.indexOf(status)
}
