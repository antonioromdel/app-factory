export function suggestedProjectName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^[^a-z]+/, '')

  return slug.slice(0, 64) || 'app'
}

export function suggestedOrg(
  packageName: string | undefined,
  bundleId: string | undefined,
): string {
  const source = (packageName || bundleId || '').trim()
  const parts = source.split('.').filter(Boolean)
  if (parts.length >= 3) {
    return parts.slice(0, -1).join('.')
  }
  if (parts.length === 2) {
    return parts.join('.')
  }
  return 'com.example'
}

export function parentDirectory(localPath: string | undefined): string {
  const trimmed = (localPath ?? '').trim().replace(/[\\/]+$/, '')
  const index = Math.max(trimmed.lastIndexOf('\\'), trimmed.lastIndexOf('/'))
  if (index <= 0) {
    return ''
  }
  return trimmed.slice(0, index)
}

export function projectDirectory(
  directory: string,
  projectName: string,
): string {
  const trimmed = directory.trim().replace(/[\\/]+$/, '')
  const separator = trimmed.includes('\\') ? '\\' : '/'
  return `${trimmed}${separator}${projectName.trim()}`
}
