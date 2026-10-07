import {
  applicationStatuses,
  type Application,
  type ApplicationStatus,
} from '@/types/application.ts'

export function statusTone(
  status: ApplicationStatus,
): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'PUBLISHED' || status === 'MAINTENANCE') {
    return 'success'
  }

  if (status === 'RELEASE' || status === 'BETA') {
    return 'warning'
  }

  if (status === 'SETUP' || status === 'DEVELOPMENT' || status === 'TESTING') {
    return 'info'
  }

  if (status === 'ARCHIVED') {
    return 'danger'
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

export function updatedLabel(application: Application, locale: string): string {
  return application.updatedAt.toDate().toLocaleDateString(locale, {
    dateStyle: 'medium',
  })
}

export function statusRank(status: ApplicationStatus | undefined): number {
  if (!status) {
    return applicationStatuses.length
  }

  return applicationStatuses.indexOf(status)
}
