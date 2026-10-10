import {
  firebaseServices,
  type Application,
  type ApplicationInput,
  type FirebaseService,
} from '@/types/application.ts'
import type { ReleasePlatform } from '@/types/release.ts'

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
  firebaseServices: FirebaseService[]
  admobAppId?: string
  admob: boolean
  inAppPurchases: boolean
  revenueCat: boolean
}

export function projectProfileFromPayload(
  value: unknown,
): ProjectProfile | null {
  if (!isRecord(value)) {
    return null
  }
  const platforms = Array.isArray(value.platforms)
    ? value.platforms.filter(
        (item): item is 'android' | 'ios' =>
          item === 'android' || item === 'ios',
      )
    : []
  const rawServices = value.firebaseServices
  const services = Array.isArray(rawServices)
    ? firebaseServices.filter((service) => rawServices.includes(service))
    : []
  const profile: ProjectProfile = {
    platforms,
    firebaseServices: services,
    admob: value.admob === true,
    inAppPurchases: value.inAppPurchases === true,
    revenueCat: value.revenueCat === true,
  }
  copyString(profile, 'description', value.description)
  copyString(profile, 'version', value.version)
  if (
    typeof value.buildNumber === 'number' &&
    Number.isInteger(value.buildNumber) &&
    value.buildNumber >= 1
  ) {
    profile.buildNumber = value.buildNumber
  }
  copyString(profile, 'dartSdk', value.dartSdk)
  copyString(profile, 'flutterVersion', value.flutterVersion)
  copyString(profile, 'packageName', value.packageName)
  copyString(profile, 'bundleId', value.bundleId)
  copyString(profile, 'minimumAndroidSdk', value.minimumAndroidSdk)
  copyString(profile, 'iosDeploymentTarget', value.iosDeploymentTarget)
  copyString(profile, 'stateManagement', value.stateManagement)
  copyString(profile, 'githubUrl', value.githubUrl)
  copyString(profile, 'repositoryName', value.repositoryName)
  copyString(profile, 'firebaseProjectId', value.firebaseProjectId)
  copyString(profile, 'firebaseProjectNumber', value.firebaseProjectNumber)
  copyString(profile, 'firebaseAndroidAppId', value.firebaseAndroidAppId)
  copyString(profile, 'firebaseIosAppId', value.firebaseIosAppId)
  copyString(profile, 'admobAppId', value.admobAppId)
  return profile
}

export function applicationInputFrom(
  application: Application,
): ApplicationInput {
  const input: ApplicationInput = { name: application.name }
  if (application.description) input.description = application.description
  if (application.status) input.status = application.status
  if (application.category) input.category = application.category
  if (application.tags) input.tags = [...application.tags]
  if (application.flutter) input.flutter = { ...application.flutter }
  if (application.repository) input.repository = { ...application.repository }
  if (application.firebase) {
    input.firebase = {
      ...application.firebase,
      ...(application.firebase.enabledServices
        ? { enabledServices: [...application.firebase.enabledServices] }
        : {}),
    }
  }
  if (application.admob) input.admob = { ...application.admob }
  if (application.revenueCat) input.revenueCat = { ...application.revenueCat }
  if (application.googlePlay) input.googlePlay = { ...application.googlePlay }
  if (application.appStore) input.appStore = { ...application.appStore }
  if (application.monetization)
    input.monetization = { ...application.monetization }
  if (application.notes) input.notes = { ...application.notes }
  return input
}

export function mergeProjectProfile(
  application: Application,
  profile: ProjectProfile,
  directory: string,
): ApplicationInput {
  const input = applicationInputFrom(application)
  if (!input.description && profile.description) {
    input.description = profile.description
  }

  const flutter = { ...input.flutter }
  setString(flutter, 'flutterVersion', profile.flutterVersion)
  setString(flutter, 'dartVersion', profile.dartSdk)
  setString(flutter, 'packageName', profile.packageName)
  setString(flutter, 'bundleId', profile.bundleId)
  setString(flutter, 'minimumAndroidSdk', profile.minimumAndroidSdk)
  setString(flutter, 'iosDeploymentTarget', profile.iosDeploymentTarget)
  setString(flutter, 'stateManagement', profile.stateManagement)
  if (hasValues(flutter)) {
    input.flutter = flutter
  }

  const repository = { ...input.repository, localPath: directory }
  setString(repository, 'githubUrl', profile.githubUrl)
  setString(repository, 'repositoryName', profile.repositoryName)
  input.repository = repository

  const firebase = { ...input.firebase }
  setString(firebase, 'projectId', profile.firebaseProjectId)
  setString(firebase, 'projectNumber', profile.firebaseProjectNumber)
  setString(firebase, 'androidAppId', profile.firebaseAndroidAppId)
  setString(firebase, 'iosAppId', profile.firebaseIosAppId)
  if (!firebase.consoleUrl && profile.firebaseProjectId) {
    firebase.consoleUrl = `https://console.firebase.google.com/project/${profile.firebaseProjectId}`
  }
  const services = firebaseServices.filter(
    (service) =>
      profile.firebaseServices.includes(service) ||
      application.firebase?.enabledServices?.includes(service),
  )
  if (services.length > 0) {
    firebase.enabledServices = services
  }
  if (hasValues(firebase)) {
    input.firebase = firebase
  }

  const admob = { ...input.admob }
  if (!admob.appId && profile.admobAppId) {
    admob.appId = profile.admobAppId
  }
  if (hasValues(admob)) {
    input.admob = admob
  }

  const monetization = { ...input.monetization }
  if (profile.admob) monetization.admob = true
  if (profile.inAppPurchases) monetization.inAppPurchases = true
  if (profile.revenueCat) monetization.revenueCat = true
  if (hasValues(monetization)) {
    input.monetization = monetization
  }

  if (
    profile.version &&
    profile.platforms.includes('android') &&
    !application.googlePlay?.currentVersion
  ) {
    input.googlePlay = { ...input.googlePlay, currentVersion: profile.version }
  }
  if (
    profile.version &&
    profile.platforms.includes('ios') &&
    !application.appStore?.currentVersion
  ) {
    input.appStore = { ...input.appStore, currentVersion: profile.version }
  }

  return input
}

export function sameApplicationInput(
  left: ApplicationInput,
  right: ApplicationInput,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function releasePlatformOf(profile: ProjectProfile): ReleasePlatform {
  const android = profile.platforms.includes('android')
  const ios = profile.platforms.includes('ios')
  if (android && !ios) {
    return 'android'
  }
  if (ios && !android) {
    return 'ios'
  }
  return 'both'
}

function copyString<T extends object>(
  target: T,
  key: keyof T,
  value: unknown,
): void {
  if (typeof value === 'string' && value.trim()) {
    target[key] = value.trim() as T[keyof T]
  }
}

function setString<T extends object>(
  target: T,
  key: keyof T,
  value: string | undefined,
): void {
  if (value) {
    target[key] = value as T[keyof T]
  }
}

function hasValues(value: object): boolean {
  return Object.values(value).some((item) => item !== undefined)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
