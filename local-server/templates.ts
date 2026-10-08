import { readFileSync } from 'node:fs'
import { flutterPlatforms, type FlutterPlatform } from './platforms.ts'

export type { FlutterPlatform }

export interface FlutterFeature {
  id: string
  packages: string[]
  requires: string[]
}

export interface FlutterTemplate {
  id: string
  platforms: FlutterPlatform[]
  features: string[]
}

const featureIdPattern = /^[a-zA-Z][a-zA-Z0-9]*$/
const packageNamePattern = /^[a-z][a-z0-9_]*$/

const catalog = loadCatalog()

export function flutterFeatures(): FlutterFeature[] {
  return catalog.features.map(copyFeature)
}

export function flutterTemplates(): FlutterTemplate[] {
  return catalog.templates.map(copyTemplate)
}

export function publicFlutterCatalog(): {
  features: FlutterFeature[]
  templates: FlutterTemplate[]
} {
  return {
    features: flutterFeatures(),
    templates: flutterTemplates(),
  }
}

export function findFlutterTemplate(id: string): FlutterTemplate | undefined {
  return flutterTemplates().find((template) => template.id === id)
}

export function resolveTemplatePackages(
  template: FlutterTemplate,
  selectedIds: string[],
): { ok: true; packages: string[] } | { ok: false; code: 'invalid-features' } {
  const allowed = new Set(template.features)
  const chosen = new Set<string>()

  for (const id of selectedIds) {
    if (!allowed.has(id) || chosen.has(id)) {
      return { ok: false, code: 'invalid-features' }
    }
    chosen.add(id)
  }

  const included = new Set(chosen)
  let pending = true
  while (pending) {
    pending = false
    for (const id of included) {
      const feature = catalog.features.find((item) => item.id === id)
      if (!feature) {
        return { ok: false, code: 'invalid-features' }
      }
      for (const required of feature.requires) {
        if (!included.has(required)) {
          included.add(required)
          pending = true
        }
      }
    }
  }

  const packages: string[] = []
  for (const feature of catalog.features) {
    if (!included.has(feature.id)) {
      continue
    }
    for (const packageName of feature.packages) {
      if (!packages.includes(packageName)) {
        packages.push(packageName)
      }
    }
  }

  return { ok: true, packages }
}

function loadCatalog(): {
  features: FlutterFeature[]
  templates: FlutterTemplate[]
} {
  const raw: unknown = JSON.parse(
    readFileSync(new URL('./flutterTemplates.json', import.meta.url), 'utf8'),
  )
  if (
    !isRecord(raw) ||
    !Array.isArray(raw.features) ||
    !Array.isArray(raw.templates)
  ) {
    throw new Error('Flutter templates file is invalid.')
  }

  const platforms = readPlatforms(raw.platforms)
  const features = raw.features.map(readFeature)
  const ids = new Set(features.map((feature) => feature.id))
  if (ids.size !== features.length) {
    throw new Error('Flutter template features must have unique ids.')
  }

  for (const feature of features) {
    for (const required of feature.requires) {
      if (!ids.has(required)) {
        throw new Error(`Unknown feature dependency: ${required}`)
      }
    }
  }

  const templates = raw.templates.map((value) =>
    readTemplate(value, ids, platforms),
  )
  const templateIds = new Set(templates.map((template) => template.id))
  if (templateIds.size !== templates.length) {
    throw new Error('Flutter templates must have unique ids.')
  }

  return { features, templates }
}

function readPlatforms(value: unknown): FlutterPlatform[] {
  if (!Array.isArray(value)) {
    throw new Error('Flutter templates need a platform list.')
  }

  const platforms = flutterPlatforms.filter((platform) =>
    value.some((item) => item === platform),
  )
  if (platforms.length !== value.length || platforms.length === 0) {
    throw new Error('Flutter templates have an unknown platform.')
  }

  return platforms
}

function readFeature(value: unknown): FlutterFeature {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !featureIdPattern.test(value.id) ||
    !Array.isArray(value.packages)
  ) {
    throw new Error('A Flutter template feature is invalid.')
  }

  const packages = value.packages.map(readPackageName)
  const requires = Array.isArray(value.requires)
    ? value.requires.map(readFeatureId)
    : []

  return { id: value.id, packages, requires }
}

function readTemplate(
  value: unknown,
  featureIds: Set<string>,
  platforms: FlutterPlatform[],
): FlutterTemplate {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !featureIdPattern.test(value.id) ||
    !Array.isArray(value.features)
  ) {
    throw new Error('A Flutter template is invalid.')
  }

  const features = value.features.map(readFeatureId)
  if (features.some((id) => !featureIds.has(id))) {
    throw new Error(`Template ${value.id} uses an unknown feature.`)
  }
  if (new Set(features).size !== features.length) {
    throw new Error(`Template ${value.id} repeats a feature.`)
  }

  return { id: value.id, platforms: [...platforms], features }
}

function readFeatureId(value: unknown): string {
  if (typeof value !== 'string' || !featureIdPattern.test(value)) {
    throw new Error('A Flutter feature id is invalid.')
  }
  return value
}

function readPackageName(value: unknown): string {
  if (typeof value !== 'string' || !packageNamePattern.test(value)) {
    throw new Error('A Flutter package name is invalid.')
  }
  return value
}

function copyFeature(feature: FlutterFeature): FlutterFeature {
  return {
    id: feature.id,
    packages: [...feature.packages],
    requires: [...feature.requires],
  }
}

function copyTemplate(template: FlutterTemplate): FlutterTemplate {
  return {
    id: template.id,
    platforms: [...template.platforms],
    features: [...template.features],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
