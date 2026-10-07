export const checklistCategories = [
  'projectCreation',
  'flutter',
  'firebase',
  'development',
  'testing',
  'android',
  'ios',
  'admob',
  'googlePlay',
  'appStore',
  'release',
] as const

export type ChecklistCategory = (typeof checklistCategories)[number]

export const checklistItems = [
  { id: 'projectCreation.defineName', category: 'projectCreation' },
  { id: 'projectCreation.writeDescription', category: 'projectCreation' },
  { id: 'projectCreation.choosePlatforms', category: 'projectCreation' },
  { id: 'projectCreation.createRepository', category: 'projectCreation' },
  { id: 'flutter.createProject', category: 'flutter' },
  { id: 'flutter.packageName', category: 'flutter' },
  { id: 'flutter.bundleId', category: 'flutter' },
  { id: 'flutter.git', category: 'flutter' },
  { id: 'flutter.architecture', category: 'flutter' },
  { id: 'flutter.dependencies', category: 'flutter' },
  { id: 'firebase.createProject', category: 'firebase' },
  { id: 'firebase.androidApp', category: 'firebase' },
  { id: 'firebase.iosApp', category: 'firebase' },
  { id: 'firebase.configFiles', category: 'firebase' },
  { id: 'firebase.services', category: 'firebase' },
  { id: 'development.architecture', category: 'development' },
  { id: 'development.stateManagement', category: 'development' },
  { id: 'development.screens', category: 'development' },
  { id: 'development.errors', category: 'development' },
  { id: 'testing.analyze', category: 'testing' },
  { id: 'testing.tests', category: 'testing' },
  { id: 'testing.androidDevice', category: 'testing' },
  { id: 'testing.iosDevice', category: 'testing' },
  { id: 'android.applicationId', category: 'android' },
  { id: 'android.minSdk', category: 'android' },
  { id: 'android.signing', category: 'android' },
  { id: 'android.aab', category: 'android' },
  { id: 'ios.bundleId', category: 'ios' },
  { id: 'ios.deploymentTarget', category: 'ios' },
  { id: 'ios.signing', category: 'ios' },
  { id: 'ios.ipa', category: 'ios' },
  { id: 'admob.createApp', category: 'admob' },
  { id: 'admob.appId', category: 'admob' },
  { id: 'admob.banner', category: 'admob' },
  { id: 'admob.interstitial', category: 'admob' },
  { id: 'admob.rewarded', category: 'admob' },
  { id: 'admob.testAds', category: 'admob' },
  { id: 'googlePlay.appCreated', category: 'googlePlay' },
  { id: 'googlePlay.storeListing', category: 'googlePlay' },
  { id: 'googlePlay.icon', category: 'googlePlay' },
  { id: 'googlePlay.featureGraphic', category: 'googlePlay' },
  { id: 'googlePlay.screenshots', category: 'googlePlay' },
  { id: 'googlePlay.description', category: 'googlePlay' },
  { id: 'googlePlay.dataSafety', category: 'googlePlay' },
  { id: 'googlePlay.contentRating', category: 'googlePlay' },
  { id: 'googlePlay.privacyPolicy', category: 'googlePlay' },
  { id: 'googlePlay.aab', category: 'googlePlay' },
  { id: 'googlePlay.internalTesting', category: 'googlePlay' },
  { id: 'googlePlay.productionRelease', category: 'googlePlay' },
  { id: 'appStore.appCreated', category: 'appStore' },
  { id: 'appStore.screenshots', category: 'appStore' },
  { id: 'appStore.description', category: 'appStore' },
  { id: 'appStore.privacyPolicy', category: 'appStore' },
  { id: 'appStore.ageRating', category: 'appStore' },
  { id: 'appStore.testFlight', category: 'appStore' },
  { id: 'appStore.review', category: 'appStore' },
  { id: 'release.version', category: 'release' },
  { id: 'release.buildNumber', category: 'release' },
  { id: 'release.changelog', category: 'release' },
  { id: 'release.analyze', category: 'release' },
  { id: 'release.tests', category: 'release' },
  { id: 'release.tag', category: 'release' },
] as const satisfies ReadonlyArray<{
  id: string
  category: ChecklistCategory
}>

export type ChecklistItem = (typeof checklistItems)[number]
export type ChecklistItemId = ChecklistItem['id']

const checklistItemIds = new Set<string>(checklistItems.map((item) => item.id))

export function isChecklistItemId(value: string): value is ChecklistItemId {
  return checklistItemIds.has(value)
}

export function itemsInCategory(category: ChecklistCategory): ChecklistItem[] {
  return checklistItems.filter((item) => item.category === category)
}

export function orderedCompletedIds(
  completed: Iterable<ChecklistItemId>,
): ChecklistItemId[] {
  const selected = new Set(completed)
  return checklistItems.map((item) => item.id).filter((id) => selected.has(id))
}
