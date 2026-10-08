import path from 'node:path'

export function isSafeDirectory(value: string): boolean {
  if (!value || value.length > 240 || !path.isAbsolute(value)) {
    return false
  }

  if (/[&|<>^%!"*?]/.test(value)) {
    return false
  }

  for (const character of value) {
    if (character.charCodeAt(0) < 32) {
      return false
    }
  }

  return true
}
