import { FirebaseError } from 'firebase/app'
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentData,
  type FieldValue,
} from 'firebase/firestore'
import { getFirebaseServices } from '@/lib/firebase.ts'
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
  type RevenueCatInfo,
} from '@/types/application.ts'

export const applicationsCollection = 'applications'

export const applicationErrorCodes = [
  'incomplete',
  'name-required',
  'load-list',
  'load-one',
  'create',
  'save',
  'archive',
  'permission',
  'unreachable',
] as const

export type ApplicationErrorCode = (typeof applicationErrorCodes)[number]

export class ApplicationDataError extends Error {
  readonly code: ApplicationErrorCode

  constructor(code: ApplicationErrorCode) {
    super(code)
    this.name = 'ApplicationDataError'
    this.code = code
  }
}

export function applicationErrorCode(
  error: unknown,
  fallback: ApplicationErrorCode,
): ApplicationErrorCode {
  if (error instanceof ApplicationDataError) {
    return error.code
  }

  return fallback
}

export function applicationFromFirestore(
  id: string,
  data: unknown,
): Application {
  if (!isRecord(data)) {
    throw new ApplicationDataError('incomplete')
  }

  const name = readString(data.name)
  if (!name) {
    throw new ApplicationDataError('incomplete')
  }

  const application: Application = {
    id,
    name,
    createdAt: readTimestamp(data.createdAt),
    updatedAt: readTimestamp(data.updatedAt),
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
  const revenueCat = readRevenueCat(data.revenueCat)
  if (revenueCat) {
    application.revenueCat = revenueCat
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
    throw new ApplicationDataError('name-required')
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
  writeGroup(document, 'revenueCat', readRevenueCat(input.revenueCat))
  writeGroup(document, 'googlePlay', readGooglePlay(input.googlePlay))
  writeGroup(document, 'appStore', readAppStore(input.appStore))
  writeGroup(document, 'monetization', readMonetization(input.monetization))
  writeGroup(document, 'notes', readNotes(input.notes))

  return document
}

export function applicationUpdateDocument(
  input: ApplicationInput,
): DocumentData {
  const name = readString(input.name)
  if (!name) {
    throw new ApplicationDataError('name-required')
  }

  return {
    name,
    updatedAt: serverTimestamp(),
    description: storedString(input.description),
    status:
      input.status && isApplicationStatus(input.status)
        ? input.status
        : deleteField(),
    category: storedString(input.category),
    tags: readStringList(input.tags) ?? deleteField(),
    flutter: storedGroup(readFlutter(input.flutter)),
    repository: storedGroup(readRepository(input.repository)),
    firebase: storedGroup(readFirebase(input.firebase)),
    admob: storedGroup(readAdMob(input.admob)),
    revenueCat: storedGroup(readRevenueCat(input.revenueCat)),
    googlePlay: storedGroup(readGooglePlay(input.googlePlay)),
    appStore: storedGroup(readAppStore(input.appStore)),
    monetization: storedGroup(readMonetization(input.monetization)),
    notes: storedGroup(readNotes(input.notes)),
  }
}

export async function listApplications(): Promise<Application[]> {
  try {
    const { db } = getFirebaseServices()
    const snapshot = await getDocs(collection(db, applicationsCollection))
    return snapshot.docs.map((item) =>
      applicationFromFirestore(item.id, item.data()),
    )
  } catch (error: unknown) {
    throw toApplicationError(error, 'load-list')
  }
}

export async function getApplication(id: string): Promise<Application | null> {
  try {
    const { db } = getFirebaseServices()
    const snapshot = await getDoc(doc(db, applicationsCollection, id))
    if (!snapshot.exists()) {
      return null
    }

    return applicationFromFirestore(snapshot.id, snapshot.data())
  } catch (error: unknown) {
    throw toApplicationError(error, 'load-one')
  }
}

export async function createApplication(
  input: ApplicationInput,
): Promise<string> {
  try {
    const { db } = getFirebaseServices()
    const created = await addDoc(
      collection(db, applicationsCollection),
      newApplicationDocument(input),
    )
    return created.id
  } catch (error: unknown) {
    throw toApplicationError(error, 'create')
  }
}

export async function updateApplication(
  id: string,
  input: ApplicationInput,
): Promise<void> {
  try {
    const { db } = getFirebaseServices()
    await updateDoc(
      doc(db, applicationsCollection, id),
      applicationUpdateDocument(input),
    )
  } catch (error: unknown) {
    throw toApplicationError(error, 'save')
  }
}

export async function saveApplicationNotes(
  id: string,
  notes: ApplicationNotes | undefined,
): Promise<void> {
  try {
    const { db } = getFirebaseServices()
    await updateDoc(doc(db, applicationsCollection, id), {
      notes: storedGroup(readNotes(notes)),
      updatedAt: serverTimestamp(),
    })
  } catch (error: unknown) {
    throw toApplicationError(error, 'save')
  }
}

export async function saveApplicationLocalPath(
  id: string,
  localPath: string,
): Promise<void> {
  const path = localPath.trim()
  if (!path) {
    throw new ApplicationDataError('save')
  }

  try {
    const { db } = getFirebaseServices()
    await updateDoc(doc(db, applicationsCollection, id), {
      'repository.localPath': path,
      updatedAt: serverTimestamp(),
    })
  } catch (error: unknown) {
    throw toApplicationError(error, 'save')
  }
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  try {
    const { db } = getFirebaseServices()
    await updateDoc(doc(db, applicationsCollection, id), {
      status,
      updatedAt: serverTimestamp(),
    })
  } catch (error: unknown) {
    throw toApplicationError(error, 'save')
  }
}

export async function archiveApplication(id: string): Promise<void> {
  try {
    const { db } = getFirebaseServices()
    await updateDoc(doc(db, applicationsCollection, id), {
      status: 'ARCHIVED',
      updatedAt: serverTimestamp(),
    })
  } catch (error: unknown) {
    throw toApplicationError(error, 'archive')
  }
}

export async function duplicateApplication(
  source: Application,
  copyName: string,
): Promise<string> {
  const copy = applicationToInput(source)
  copy.name = copyName
  return createApplication(copy)
}

function applicationToInput(source: Application): ApplicationInput {
  const input: ApplicationInput = { name: source.name }
  if (source.description) input.description = source.description
  if (source.status === 'ARCHIVED') {
    input.status = 'IDEA'
  } else if (source.status) {
    input.status = source.status
  }
  if (source.category) input.category = source.category
  if (source.tags) input.tags = source.tags
  if (source.flutter) input.flutter = source.flutter
  if (source.repository) input.repository = source.repository
  if (source.firebase) input.firebase = source.firebase
  if (source.admob) input.admob = source.admob
  if (source.revenueCat) input.revenueCat = source.revenueCat
  if (source.googlePlay) input.googlePlay = source.googlePlay
  if (source.appStore) input.appStore = source.appStore
  if (source.monetization) input.monetization = source.monetization
  if (source.notes) input.notes = source.notes
  return input
}

function storedString(value: string | undefined): string | FieldValue {
  return readString(value) ?? deleteField()
}

function storedGroup(value: object | undefined): object | FieldValue {
  return value && hasFields(value) ? value : deleteField()
}

function toApplicationError(
  error: unknown,
  fallback: ApplicationErrorCode,
): ApplicationDataError {
  if (error instanceof ApplicationDataError) {
    return error
  }

  if (error instanceof FirebaseError) {
    console.error(`Application request failed: ${error.code}`)

    if (error.code === 'permission-denied') {
      return new ApplicationDataError('permission')
    }

    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      return new ApplicationDataError('unreachable')
    }
  } else {
    console.error('Application request failed.')
  }

  return new ApplicationDataError(fallback)
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
  assignString(info, 'consoleUrl', value.consoleUrl)
  assignString(info, 'appId', value.appId)
  assignString(info, 'bannerId', value.bannerId)
  assignString(info, 'interstitialId', value.interstitialId)
  assignString(info, 'rewardedId', value.rewardedId)
  assignString(info, 'nativeId', value.nativeId)
  return hasFields(info) ? info : undefined
}

function readRevenueCat(value: unknown): RevenueCatInfo | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const info: RevenueCatInfo = {}
  assignString(info, 'dashboardUrl', value.dashboardUrl)
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
  assignString(notes, 'architectureDecisions', value.architectureDecisions)
  assignString(notes, 'importantCommands', value.importantCommands)
  assignString(notes, 'lessonsLearned', value.lessonsLearned)
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

function readTimestamp(value: unknown): Timestamp {
  if (value instanceof Timestamp) {
    return value
  }

  throw new ApplicationDataError('incomplete')
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
