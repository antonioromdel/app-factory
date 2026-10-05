import type { Timestamp } from 'firebase/firestore'

// Only the name is required. Every other detail can be omitted when it is still unknown.
export const applicationStatuses = [
  'IDEA',
  'PLANNING',
  'SETUP',
  'DEVELOPMENT',
  'TESTING',
  'BETA',
  'RELEASE',
  'PUBLISHED',
  'MAINTENANCE',
  'ARCHIVED',
] as const

export type ApplicationStatus = (typeof applicationStatuses)[number]

export const firebaseServices = [
  'authentication',
  'firestore',
  'storage',
  'analytics',
  'crashlytics',
  'messaging',
  'functions',
  'remoteConfig',
] as const

export type FirebaseService = (typeof firebaseServices)[number]

export interface FlutterInfo {
  flutterVersion?: string
  dartVersion?: string
  packageName?: string
  bundleId?: string
  minimumAndroidSdk?: string
  iosDeploymentTarget?: string
  architecture?: string
  stateManagement?: string
}

export interface RepositoryInfo {
  githubUrl?: string
  repositoryName?: string
  localPath?: string
}

export interface FirebaseProjectInfo {
  projectId?: string
  projectNumber?: string
  consoleUrl?: string
  androidAppId?: string
  iosAppId?: string
  enabledServices?: FirebaseService[]
}

export interface AdMobInfo {
  appId?: string
  bannerId?: string
  interstitialId?: string
  rewardedId?: string
  nativeId?: string
}

export interface GooglePlayInfo {
  consoleUrl?: string
  storeUrl?: string
  currentVersion?: string
  track?: string
}

export interface AppStoreInfo {
  appStoreConnectUrl?: string
  storeUrl?: string
  currentVersion?: string
  testFlightUrl?: string
}

export interface MonetizationInfo {
  admob?: boolean
  inAppPurchases?: boolean
  subscriptions?: boolean
  revenueCat?: boolean
}

export interface ApplicationNotes {
  technicalNotes?: string
  knownIssues?: string
  ideas?: string
}

export interface Application {
  id: string
  name: string
  description?: string
  status?: ApplicationStatus
  category?: string
  tags?: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
  flutter?: FlutterInfo
  repository?: RepositoryInfo
  firebase?: FirebaseProjectInfo
  admob?: AdMobInfo
  googlePlay?: GooglePlayInfo
  appStore?: AppStoreInfo
  monetization?: MonetizationInfo
  notes?: ApplicationNotes
}

export interface ApplicationInput {
  name: string
  description?: string
  status?: ApplicationStatus
  category?: string
  tags?: string[]
  flutter?: FlutterInfo
  repository?: RepositoryInfo
  firebase?: FirebaseProjectInfo
  admob?: AdMobInfo
  googlePlay?: GooglePlayInfo
  appStore?: AppStoreInfo
  monetization?: MonetizationInfo
  notes?: ApplicationNotes
}
