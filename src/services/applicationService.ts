import {
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore'
import {
  applicationStatuses,
  firebaseServices,
  type AdMobInfo,
  type Application,
  type ApplicationInput,
  type ApplicationNotes,
  type ApplicationStatus,
  type AppStoreInfo,
  type FirebaseProjectInfo,
  type FirebaseService,
  type FlutterInfo,
  type GooglePlayInfo,
  type MonetizationInfo,
  type RepositoryInfo,
} from '@/types/application.ts'

export const applicationsCollection = 'applications'

export class ApplicationDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApplicationDataError'
  }
}

export function applicationFromFirestore(
  id: string,
  data: unknown,
): Application {
  if (!isRecord(data)) {
    throw new ApplicationDataError('Application data is missing.')
  }

  const name = readString(data.name)
  if (!name) {
    throw new ApplicationDataError('Application name is missing.')
  }

  const application: Application = {
    id,
    name,
    createdAt: readTimestamp(data.createdAt, 'createdAt'),
    updatedAt: readTimestamp(data.updatedAt, 'updatedAt'),
  }

  assignString(application, 'description', data.description)
  const status = readStatus(data.status)
  if (status) {
    application.status = status
  }
  assignString(application, 'category', data.category)
  const tags = readStringList(data.tags)
  if (tags) {
    application.tags = tags
  }

  const flutter = readFlutter(data.flutter)
  if (flutter) {
    application.flutter = flutter
  }
  const repository = readRepository(data.repository)
  if (repository) {
    application.repository = repository
  }
  const firebase = readFirebase(data.firebase)
  if (firebase) {
    application.firebase = firebase
  }
  const admob = readAdMob(data.admob)
  if (admob) {
    application.admob = admob
  }
  const googlePlay = readGooglePlay(data.googlePlay)
  if (googlePlay) {
    application.googlePlay = googlePlay
  }
  const appStore = readAppStore(data.appStore)
  if (appStore) {
    application.appStore = appStore
  }
  const monetization = readMonetization(data.monetization)
  if (monetization) {
    application.monetization = monetization
  }
  const notes = readNotes(data.notes)
  if (notes) {
    application.notes = notes
  }

  return application
}

export function newApplicationDocument(input: ApplicationInput): DocumentData {
  const name = readString(input.name)
  if (!name) {
    throw new ApplicationDataError('Application name is required.')
  }

  const document: DocumentData = {
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  writeString(document, 'description', input.description)
  if (input.status && isApplicationStatus(input.status)) {
    document.status = input.status
  }
  writeString(document, 'category', input.category)
  const tags = readStringList(input.tags)
  if (tags) {
    document.tags = tags
  }

  writeGroup(document, 'flutter', readFlutter(input.flutter))
  writeGroup(document, 'repository', readRepository(input.repository))
  writeGroup(document, 'firebase', readFirebase(input.firebase))
  writeGroup(document, 'admob', readAdMob(input.admob))
  writeGroup(document, 'googlePlay', readGooglePlay(input.googlePlay))
  writeGroup(document, 'appStore', readAppStore(input.appStore))
  writeGroup(document, 'monetization', readMonetization(input.monetization))
  writeGroup(document, 'notes', readNotes(input.notes))

  return document
}

function readFlutter(value: unknown): FlutterInfo | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const info: FlutterInfo = {}
  assignString(info, 'flutterVersion', value.flutterVersion)
  assignString(info, 'dartVersion', value.dartVersion)
  assignString(info, 'packageName', value.packageName)
  assignString(info, 'bundleId', value.bundleId)
  assignString(info, 'minimumAndroidSdk', value.minimumAndroidSdk)
  assignString(info, 'iosDeploymentTarget', value.iosDeploymentTarget)
  assignString(info, 'architecture', value.architecture)
  assignString(info, 'stateManagement', value.stateManagement)
  return hasFields(info) ? info : undefined
}

function readRepository(value: unknown): RepositoryInfo | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const info: RepositoryInfo = {}
  assignString(info, 'githubUrl', value.githubUrl)
  assignString(info, 'repositoryName', value.repositoryName)
  assignString(info, 'localPath', value.localPath)
  return hasFields(info) ? info : undefined
}

function readFirebase(value: unknown): FirebaseProjectInfo | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const info: FirebaseProjectInfo = {}
  assignString(info, 'projectId', value.projectId)
  assignString(info, 'projectNumber', value.projectNumber)
  assignString(info, 'consoleUrl', value.consoleUrl)
  assignString(info, 'androidAppId', value.androidAppId)
  assignString(info, 'iosAppId', value.iosAppId)
  const enabledServices = readServices(value.enabledServices)
  if (enabledServices) {
    info.enabledServices = enabledServices
  }
  return hasFields(info) ? info : undefined
}

function readAdMob(value: unknown): AdMobInfo | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const info: AdMobInfo = {}
  assignString(info, 'appId', value.appId)
  assignString(info, 'bannerId', value.bannerId)
  assignString(info, 'interstitialId', value.interstitialId)
  assignString(info, 'rewardedId', value.rewardedId)
  assignString(info, 'nativeId', value.nativeId)
  return hasFields(info) ? info : undefined
}

function readGooglePlay(value: unknown): GooglePlayInfo | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const info: GooglePlayInfo = {}
  assignString(info, 'consoleUrl', value.consoleUrl)
  assignString(info, 'storeUrl', value.storeUrl)
  assignString(info, 'currentVersion', value.currentVersion)
  assignString(info, 'track', value.track)
  return hasFields(info) ? info : undefined
}

function readAppStore(value: unknown): AppStoreInfo | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const info: AppStoreInfo = {}
  assignString(info, 'appStoreConnectUrl', value.appStoreConnectUrl)
  assignString(info, 'storeUrl', value.storeUrl)
  assignString(info, 'currentVersion', value.currentVersion)
  assignString(info, 'testFlightUrl', value.testFlightUrl)
  return hasFields(info) ? info : undefined
}

function readMonetization(value: unknown): MonetizationInfo | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const info: MonetizationInfo = {}
  assignBoolean(info, 'admob', value.admob)
  assignBoolean(info, 'inAppPurchases', value.inAppPurchases)
  assignBoolean(info, 'subscriptions', value.subscriptions)
  assignBoolean(info, 'revenueCat', value.revenueCat)
  return hasFields(info) ? info : undefined
}

function readNotes(value: unknown): ApplicationNotes | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const notes: ApplicationNotes = {}
  assignString(notes, 'technicalNotes', value.technicalNotes)
  assignString(notes, 'knownIssues', value.knownIssues)
  assignString(notes, 'ideas', value.ideas)
  return hasFields(notes) ? notes : undefined
}

function assignString<T extends object>(
  target: T,
  key: keyof T,
  value: unknown,
): void {
  const text = readString(value)
  if (text) {
    target[key] = text as T[keyof T]
  }
}

function writeString(
  target: DocumentData,
  key: string,
  value: string | undefined,
): void {
  const text = readString(value)
  if (text) {
    target[key] = text
  }
}

function assignBoolean<T extends object>(
  target: T,
  key: keyof T,
  value: unknown,
): void {
  if (typeof value === 'boolean') {
    target[key] = value as T[keyof T]
  }
}

function writeGroup(
  target: DocumentData,
  key: string,
  value: object | undefined,
): void {
  if (value && hasFields(value)) {
    target[key] = value
  }
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return items.length > 0 ? items : undefined
}

function readServices(value: unknown): FirebaseService[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const services = firebaseServices.filter((service) => value.includes(service))
  return services.length > 0 ? services : undefined
}

function readStatus(value: unknown): ApplicationStatus | undefined {
  return isApplicationStatus(value) ? value : undefined
}

function readTimestamp(value: unknown, field: string): Timestamp {
  if (value instanceof Timestamp) {
    return value
  }

  throw new ApplicationDataError(`Application ${field} is missing.`)
}

function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return (
    typeof value === 'string' &&
    applicationStatuses.some((status) => status === value)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasFields(value: object): boolean {
  return Object.keys(value).length > 0
}
