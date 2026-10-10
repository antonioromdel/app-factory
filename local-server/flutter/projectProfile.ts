const firebaseServiceIds = [
  'authentication',
  'firestore',
  'storage',
  'analytics',
  'crashlytics',
  'messaging',
  'functions',
  'remoteConfig',
] as const

type FirebaseServiceId = (typeof firebaseServiceIds)[number]

const dependencyServices: Record<string, FirebaseServiceId> = {
  firebase_auth: 'authentication',
  cloud_firestore: 'firestore',
  firebase_storage: 'storage',
  firebase_analytics: 'analytics',
  firebase_crashlytics: 'crashlytics',
  firebase_messaging: 'messaging',
  cloud_functions: 'functions',
  firebase_remote_config: 'remoteConfig',
}

const statePackages: Array<[string, string]> = [
  ['flutter_riverpod', 'Riverpod'],
  ['hooks_riverpod', 'Riverpod'],
  ['riverpod', 'Riverpod'],
  ['flutter_bloc', 'Bloc'],
  ['bloc', 'Bloc'],
  ['flutter_mobx', 'MobX'],
  ['mobx', 'MobX'],
  ['get', 'GetX'],
  ['provider', 'Provider'],
]

export interface ProjectProfile {
  description?: string
  version?: string
  buildNumber?: number
  dartSdk?: string
  flutterVersion?: string
  packageName?: string
  bundleId?: string
  minimumAndroidSdk?: string
  iosDeploymentTarget?: string
  stateManagement?: string
  platforms: Array<'android' | 'ios'>
  githubUrl?: string
  repositoryName?: string
  firebaseProjectId?: string
  firebaseProjectNumber?: string
  firebaseAndroidAppId?: string
  firebaseIosAppId?: string
  firebaseServices: FirebaseServiceId[]
  admobAppId?: string
  admob: boolean
  inAppPurchases: boolean
  revenueCat: boolean
}

export interface ProjectSources {
  pubspec: string
  androidGradle?: string
  pbxproj?: string
  gitConfig?: string
  googleServices?: string
  iosPlist?: string
  androidManifest?: string
  iosInfoPlist?: string
  firebaseJson?: string
  fvm?: string
  hasAndroid: boolean
  hasIos: boolean
}

export function buildProjectProfile(sources: ProjectSources): ProjectProfile {
  const pubspec = parsePubspec(sources.pubspec)
  const gradle = parseAndroidGradle(sources.androidGradle ?? '')
  const apple = parsePbxproj(sources.pbxproj ?? '')
  const remote = githubRemote(parseGitRemote(sources.gitConfig ?? ''))
  const androidFirebase = parseGoogleServices(sources.googleServices ?? '')
  const iosFirebase = parseGoogleServiceInfo(sources.iosPlist ?? '')
  const firebaseFromConfig = parseFirebaseJson(sources.firebaseJson ?? '')
  const services = new Set<FirebaseServiceId>([
    ...pubspec.firebaseServices,
    ...firebaseFromConfig,
  ])
  const flutterVersion =
    parseFvmVersion(sources.fvm ?? '') ?? pubspec.flutterSdk

  const profile: ProjectProfile = {
    platforms: platformsFrom(sources.hasAndroid, sources.hasIos),
    firebaseServices: firebaseServiceIds.filter((service) =>
      services.has(service),
    ),
    admob: pubspec.packages.has('google_mobile_ads'),
    inAppPurchases:
      pubspec.packages.has('in_app_purchase') ||
      pubspec.packages.has('purchases_flutter'),
    revenueCat: pubspec.packages.has('purchases_flutter'),
  }

  assign(profile, 'description', pubspec.description)
  assign(profile, 'version', pubspec.version)
  if (pubspec.buildNumber) {
    profile.buildNumber = pubspec.buildNumber
  }
  assign(profile, 'dartSdk', pubspec.dartSdk)
  assign(profile, 'flutterVersion', flutterVersion)
  assign(profile, 'packageName', gradle.applicationId)
  assign(profile, 'bundleId', apple.bundleId)
  assign(profile, 'minimumAndroidSdk', gradle.minSdk)
  assign(profile, 'iosDeploymentTarget', apple.deploymentTarget)
  assign(profile, 'stateManagement', stateManagement(pubspec.packages))
  assign(profile, 'githubUrl', remote?.githubUrl)
  assign(profile, 'repositoryName', remote?.repositoryName)
  assign(
    profile,
    'firebaseProjectId',
    androidFirebase.projectId ?? iosFirebase.projectId,
  )
  assign(
    profile,
    'firebaseProjectNumber',
    androidFirebase.projectNumber ?? iosFirebase.projectNumber,
  )
  assign(profile, 'firebaseAndroidAppId', androidFirebase.appId)
  assign(profile, 'firebaseIosAppId', iosFirebase.appId)
  assign(
    profile,
    'admobAppId',
    parseAdMobAppId(sources.androidManifest ?? '') ??
      parsePlistString(sources.iosInfoPlist ?? '', 'GADApplicationIdentifier'),
  )

  return profile
}

export function parsePubspec(text: string): {
  description?: string
  version?: string
  buildNumber?: number
  dartSdk?: string
  flutterSdk?: string
  packages: Set<string>
  firebaseServices: FirebaseServiceId[]
} {
  let section: 'environment' | 'dependencies' | 'overrides' | null = null
  let description: string | undefined
  let version: string | undefined
  let buildNumber: number | undefined
  let dartSdk: string | undefined
  let flutterSdk: string | undefined
  const packages = new Set<string>()

  for (const line of text.split(/\r?\n/)) {
    if (/^\s*#/.test(line) || line.trim() === '') {
      continue
    }
    if (/^[^\s]/.test(line)) {
      if (line.startsWith('environment:')) {
        section = 'environment'
      } else if (line.startsWith('dependencies:')) {
        section = 'dependencies'
      } else if (line.startsWith('dependency_overrides:')) {
        section = 'overrides'
      } else {
        section = null
      }
      const descriptionMatch = /^description:\s*(.*)$/.exec(line)
      if (descriptionMatch?.[1]) {
        description = unquote(descriptionMatch[1])
      }
      const versionMatch = /^version:\s*(.*)$/.exec(line)
      if (versionMatch?.[1]) {
        const parsed = parseVersion(versionMatch[1])
        version = parsed.version
        buildNumber = parsed.buildNumber
      }
      continue
    }

    if (section === 'environment') {
      const sdk = /^ {2}sdk:\s*(.*)$/.exec(line)
      if (sdk?.[1]) {
        dartSdk = unquote(sdk[1])
      }
      const flutter = /^ {2}flutter:\s*(.*)$/.exec(line)
      if (flutter?.[1]) {
        flutterSdk = unquote(flutter[1])
      }
      continue
    }

    if (section === 'dependencies' || section === 'overrides') {
      const name = /^ {2}([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(line)?.[1]
      if (name && name !== 'flutter' && name !== 'flutter_localizations') {
        packages.add(name)
      }
    }
  }

  return {
    ...(description ? { description } : {}),
    ...(version ? { version } : {}),
    ...(buildNumber ? { buildNumber } : {}),
    ...(dartSdk ? { dartSdk } : {}),
    ...(flutterSdk ? { flutterSdk } : {}),
    packages,
    firebaseServices: firebaseServiceIds.filter((service) =>
      [...packages].some((name) => dependencyServices[name] === service),
    ),
  }
}

export function parseAndroidGradle(text: string): {
  applicationId?: string
  minSdk?: string
} {
  const application =
    /applicationId\s*=?\s*["']([a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)+)["']/.exec(
      text,
    )?.[1] ??
    /namespace\s*=?\s*["']([a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)+)["']/.exec(
      text,
    )?.[1]
  const minSdk = /minSdk(?:Version)?\s*=?\s*(\d{1,2})\b/.exec(text)?.[1]
  return {
    ...(application ? { applicationId: application } : {}),
    ...(minSdk ? { minSdk } : {}),
  }
}

export function parsePbxproj(text: string): {
  bundleId?: string
  deploymentTarget?: string
} {
  let bundleId: string | undefined
  for (const match of text.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)) {
    const value = match[1]?.trim().replace(/^"|"$/g, '') ?? ''
    if (!value || value.startsWith('$') || /Tests$/i.test(value)) {
      continue
    }
    bundleId = value
    break
  }
  const deploymentTarget =
    /IPHONEOS_DEPLOYMENT_TARGET = ([0-9]+(?:\.[0-9]+)?);/.exec(text)?.[1]
  return {
    ...(bundleId ? { bundleId } : {}),
    ...(deploymentTarget ? { deploymentTarget } : {}),
  }
}

export function parseGitRemote(text: string): string | undefined {
  const match = /\[remote "origin"\][^[]*?^\s*url = (\S+)/m.exec(text)
  return match?.[1]
}

export function githubRemote(
  url: string | undefined,
): { githubUrl: string; repositoryName: string } | undefined {
  if (!url) {
    return undefined
  }
  const ssh = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(
    url.trim(),
  )
  const https =
    /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(
      url.trim(),
    )
  const match = ssh ?? https
  const owner = match?.[1]
  const name = match?.[2]
  if (!owner || !name) {
    return undefined
  }
  return {
    githubUrl: `https://github.com/${owner}/${name}`,
    repositoryName: name,
  }
}

export function parseGoogleServices(text: string): {
  projectId?: string
  projectNumber?: string
  appId?: string
} {
  try {
    const parsed: unknown = JSON.parse(text)
    if (!isRecord(parsed)) {
      return {}
    }
    const info = isRecord(parsed.project_info) ? parsed.project_info : undefined
    const client = Array.isArray(parsed.client) ? parsed.client[0] : undefined
    const clientInfo =
      isRecord(client) && isRecord(client.client_info)
        ? client.client_info
        : undefined
    const projectId = readText(info?.project_id)
    const projectNumber = readText(info?.project_number)
    const appId = readText(clientInfo?.mobilesdk_app_id)
    return {
      ...(projectId ? { projectId } : {}),
      ...(projectNumber ? { projectNumber } : {}),
      ...(appId ? { appId } : {}),
    }
  } catch {
    return {}
  }
}

export function parseGoogleServiceInfo(text: string): {
  projectId?: string
  projectNumber?: string
  appId?: string
} {
  const projectId = parsePlistString(text, 'PROJECT_ID')
  const projectNumber = parsePlistString(text, 'GCM_SENDER_ID')
  const appId = parsePlistString(text, 'GOOGLE_APP_ID')
  return {
    ...(projectId ? { projectId } : {}),
    ...(projectNumber ? { projectNumber } : {}),
    ...(appId ? { appId } : {}),
  }
}

export function parsePlistString(
  text: string,
  key: string,
): string | undefined {
  const match = new RegExp(
    `<key>${key}</key>\\s*<string>([^<]*)</string>`,
  ).exec(text)
  const value = match?.[1]?.trim()
  return value || undefined
}

export function parseAdMobAppId(text: string): string | undefined {
  const namedFirst =
    /android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[\s\S]{0,400}?android:value="([^"]+)"/.exec(
      text,
    )?.[1]
  const valueFirst =
    /android:value="([^"]+)"[\s\S]{0,400}?android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"/.exec(
      text,
    )?.[1]
  const value = namedFirst ?? valueFirst
  return value?.trim() || undefined
}

export function parseFirebaseJson(text: string): FirebaseServiceId[] {
  try {
    const parsed: unknown = JSON.parse(text)
    if (!isRecord(parsed)) {
      return []
    }
    const present = new Set(Object.keys(parsed))
    const services: FirebaseServiceId[] = []
    if (present.has('firestore')) {
      services.push('firestore')
    }
    if (present.has('storage')) {
      services.push('storage')
    }
    if (present.has('functions')) {
      services.push('functions')
    }
    return services
  } catch {
    return []
  }
}

export function parseFvmVersion(text: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(text)
    if (!isRecord(parsed)) {
      return undefined
    }
    return readText(parsed.flutter) ?? readText(parsed.flutterSdkVersion)
  } catch {
    return undefined
  }
}

export function parseVersion(value: string): {
  version?: string
  buildNumber?: number
} {
  const trimmed = unquote(value)
  const match = /^([0-9A-Za-z][0-9A-Za-z._-]{0,39})(?:\+(\d+))?$/.exec(trimmed)
  const version = match?.[1]
  if (!version || !/^[0-9A-Za-z][0-9A-Za-z._-]{0,39}$/.test(version)) {
    return {}
  }
  const rawBuild = match?.[2]
  let buildNumber = rawBuild ? Number(rawBuild) : 1
  if (
    !Number.isInteger(buildNumber) ||
    buildNumber < 1 ||
    buildNumber > 999_999_999
  ) {
    buildNumber = 1
  }
  return { version, buildNumber }
}

function stateManagement(packages: Set<string>): string | undefined {
  for (const [name, label] of statePackages) {
    if (packages.has(name)) {
      return label
    }
  }
  return undefined
}

function platformsFrom(
  hasAndroid: boolean,
  hasIos: boolean,
): Array<'android' | 'ios'> {
  const platforms: Array<'android' | 'ios'> = []
  if (hasAndroid) {
    platforms.push('android')
  }
  if (hasIos) {
    platforms.push('ios')
  }
  return platforms
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function assign<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (value) {
    target[key] = value
  }
}

function readText(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed || undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
