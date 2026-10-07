import {
  firebaseServices,
  type Application,
  type ApplicationInput,
  type ApplicationStatus,
  type FirebaseService,
} from '@/types/application.ts'

export interface ApplicationFormState {
  name: string
  description: string
  status: ApplicationStatus | ''
  category: string
  tags: string
  flutterVersion: string
  dartVersion: string
  packageName: string
  bundleId: string
  minimumAndroidSdk: string
  iosDeploymentTarget: string
  architecture: string
  stateManagement: string
  githubUrl: string
  repositoryName: string
  localPath: string
  firebaseProjectId: string
  projectNumber: string
  firebaseConsoleUrl: string
  androidAppId: string
  iosAppId: string
  services: FirebaseService[]
  admobConsoleUrl: string
  admobAppId: string
  bannerId: string
  interstitialId: string
  rewardedId: string
  nativeId: string
  revenueCatUrl: string
  admob: boolean
  inAppPurchases: boolean
  subscriptions: boolean
  revenueCat: boolean
  playConsoleUrl: string
  playStoreUrl: string
  playVersion: string
  playTrack: string
  appStoreConnectUrl: string
  appStoreUrl: string
  appStoreVersion: string
  testFlightUrl: string
  technicalNotes: string
  knownIssues: string
  ideas: string
}

export function emptyApplicationForm(): ApplicationFormState {
  return {
    name: '',
    description: '',
    status: '',
    category: '',
    tags: '',
    flutterVersion: '',
    dartVersion: '',
    packageName: '',
    bundleId: '',
    minimumAndroidSdk: '',
    iosDeploymentTarget: '',
    architecture: '',
    stateManagement: '',
    githubUrl: '',
    repositoryName: '',
    localPath: '',
    firebaseProjectId: '',
    projectNumber: '',
    firebaseConsoleUrl: '',
    androidAppId: '',
    iosAppId: '',
    services: [],
    admobConsoleUrl: '',
    admobAppId: '',
    bannerId: '',
    interstitialId: '',
    rewardedId: '',
    nativeId: '',
    revenueCatUrl: '',
    admob: false,
    inAppPurchases: false,
    subscriptions: false,
    revenueCat: false,
    playConsoleUrl: '',
    playStoreUrl: '',
    playVersion: '',
    playTrack: '',
    appStoreConnectUrl: '',
    appStoreUrl: '',
    appStoreVersion: '',
    testFlightUrl: '',
    technicalNotes: '',
    knownIssues: '',
    ideas: '',
  }
}

export function formFromApplication(
  application: Application,
): ApplicationFormState {
  const form = emptyApplicationForm()
  form.name = application.name
  form.description = application.description ?? ''
  form.status = application.status ?? ''
  form.category = application.category ?? ''
  form.tags = application.tags?.join(', ') ?? ''
  form.flutterVersion = application.flutter?.flutterVersion ?? ''
  form.dartVersion = application.flutter?.dartVersion ?? ''
  form.packageName = application.flutter?.packageName ?? ''
  form.bundleId = application.flutter?.bundleId ?? ''
  form.minimumAndroidSdk = application.flutter?.minimumAndroidSdk ?? ''
  form.iosDeploymentTarget = application.flutter?.iosDeploymentTarget ?? ''
  form.architecture = application.flutter?.architecture ?? ''
  form.stateManagement = application.flutter?.stateManagement ?? ''
  form.githubUrl = application.repository?.githubUrl ?? ''
  form.repositoryName = application.repository?.repositoryName ?? ''
  form.localPath = application.repository?.localPath ?? ''
  form.firebaseProjectId = application.firebase?.projectId ?? ''
  form.projectNumber = application.firebase?.projectNumber ?? ''
  form.firebaseConsoleUrl = application.firebase?.consoleUrl ?? ''
  form.androidAppId = application.firebase?.androidAppId ?? ''
  form.iosAppId = application.firebase?.iosAppId ?? ''
  form.services = application.firebase?.enabledServices ?? []
  form.admobConsoleUrl = application.admob?.consoleUrl ?? ''
  form.admobAppId = application.admob?.appId ?? ''
  form.bannerId = application.admob?.bannerId ?? ''
  form.interstitialId = application.admob?.interstitialId ?? ''
  form.rewardedId = application.admob?.rewardedId ?? ''
  form.nativeId = application.admob?.nativeId ?? ''
  form.revenueCatUrl = application.revenueCat?.dashboardUrl ?? ''
  form.admob = application.monetization?.admob === true
  form.inAppPurchases = application.monetization?.inAppPurchases === true
  form.subscriptions = application.monetization?.subscriptions === true
  form.revenueCat = application.monetization?.revenueCat === true
  form.playConsoleUrl = application.googlePlay?.consoleUrl ?? ''
  form.playStoreUrl = application.googlePlay?.storeUrl ?? ''
  form.playVersion = application.googlePlay?.currentVersion ?? ''
  form.playTrack = application.googlePlay?.track ?? ''
  form.appStoreConnectUrl = application.appStore?.appStoreConnectUrl ?? ''
  form.appStoreUrl = application.appStore?.storeUrl ?? ''
  form.appStoreVersion = application.appStore?.currentVersion ?? ''
  form.testFlightUrl = application.appStore?.testFlightUrl ?? ''
  form.technicalNotes = application.notes?.technicalNotes ?? ''
  form.knownIssues = application.notes?.knownIssues ?? ''
  form.ideas = application.notes?.ideas ?? ''
  return form
}

export function toApplicationInput(
  form: ApplicationFormState,
): ApplicationInput {
  const input: ApplicationInput = { name: form.name.trim() }
  assign(input, 'description', form.description)
  if (form.status) {
    input.status = form.status
  }
  assign(input, 'category', form.category)
  const tags = form.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
  if (tags.length > 0) {
    input.tags = tags
  }

  const flutter = strings({
    flutterVersion: form.flutterVersion,
    dartVersion: form.dartVersion,
    packageName: form.packageName,
    bundleId: form.bundleId,
    minimumAndroidSdk: form.minimumAndroidSdk,
    iosDeploymentTarget: form.iosDeploymentTarget,
    architecture: form.architecture,
    stateManagement: form.stateManagement,
  })
  if (flutter) {
    input.flutter = flutter
  }

  const repository = strings({
    githubUrl: form.githubUrl,
    repositoryName: form.repositoryName,
    localPath: form.localPath,
  })
  if (repository) {
    input.repository = repository
  }

  const services = firebaseServices.filter((service) =>
    form.services.includes(service),
  )
  const firebase = strings({
    projectId: form.firebaseProjectId,
    projectNumber: form.projectNumber,
    consoleUrl: form.firebaseConsoleUrl,
    androidAppId: form.androidAppId,
    iosAppId: form.iosAppId,
  })
  if (firebase || services.length > 0) {
    input.firebase = {
      ...firebase,
      ...(services.length > 0 ? { enabledServices: services } : {}),
    }
  }

  const admob = strings({
    consoleUrl: form.admobConsoleUrl,
    appId: form.admobAppId,
    bannerId: form.bannerId,
    interstitialId: form.interstitialId,
    rewardedId: form.rewardedId,
    nativeId: form.nativeId,
  })
  if (admob) {
    input.admob = admob
  }

  const revenueCat = strings({
    dashboardUrl: form.revenueCatUrl,
  })
  if (revenueCat) {
    input.revenueCat = revenueCat
  }

  const googlePlay = strings({
    consoleUrl: form.playConsoleUrl,
    storeUrl: form.playStoreUrl,
    currentVersion: form.playVersion,
    track: form.playTrack,
  })
  if (googlePlay) {
    input.googlePlay = googlePlay
  }

  const appStore = strings({
    appStoreConnectUrl: form.appStoreConnectUrl,
    storeUrl: form.appStoreUrl,
    currentVersion: form.appStoreVersion,
    testFlightUrl: form.testFlightUrl,
  })
  if (appStore) {
    input.appStore = appStore
  }

  const monetization = flags({
    admob: form.admob,
    inAppPurchases: form.inAppPurchases,
    subscriptions: form.subscriptions,
    revenueCat: form.revenueCat,
  })
  if (monetization) {
    input.monetization = monetization
  }

  const notes = strings({
    technicalNotes: form.technicalNotes,
    knownIssues: form.knownIssues,
    ideas: form.ideas,
  })
  if (notes) {
    input.notes = notes
  }

  return input
}

function assign(
  input: ApplicationInput,
  key: 'description' | 'category',
  value: string,
): void {
  const trimmed = value.trim()
  if (trimmed) {
    input[key] = trimmed
  }
}

function strings<Key extends string>(
  values: Record<Key, string>,
): Partial<Record<Key, string>> | undefined {
  const result: Partial<Record<Key, string>> = {}
  for (const key of Object.keys(values) as Key[]) {
    const trimmed = values[key].trim()
    if (trimmed) {
      result[key] = trimmed
    }
  }

  return Object.keys(result).length > 0 ? result : undefined
}

function flags<Key extends string>(
  values: Record<Key, boolean>,
): Partial<Record<Key, true>> | undefined {
  const result: Partial<Record<Key, true>> = {}
  for (const key of Object.keys(values) as Key[]) {
    if (values[key]) {
      result[key] = true
    }
  }

  return Object.keys(result).length > 0 ? result : undefined
}
