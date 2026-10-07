import type { FirebaseService } from '@/types/application.ts'
import type { ApplicationInput } from '@/types/application.ts'
import {
  emptyApplicationForm,
  toApplicationInput,
} from './applicationFormState.ts'

export const wizardFirebaseServices = [
  'authentication',
  'firestore',
  'storage',
  'analytics',
  'crashlytics',
  'messaging',
] as const satisfies readonly FirebaseService[]

export type WizardBackend = 'none' | 'firebase'

export interface ApplicationWizardState {
  name: string
  description: string
  category: string
  tags: string
  android: boolean
  ios: boolean
  packageName: string
  bundleId: string
  architecture: string
  stateManagement: string
  backend: WizardBackend
  services: FirebaseService[]
  admob: boolean
  inAppPurchases: boolean
  subscriptions: boolean
  revenueCat: boolean
  githubUrl: string
  localPath: string
}

export function emptyApplicationWizard(): ApplicationWizardState {
  return {
    name: '',
    description: '',
    category: '',
    tags: '',
    android: false,
    ios: false,
    packageName: '',
    bundleId: '',
    architecture: '',
    stateManagement: '',
    backend: 'none',
    services: [],
    admob: false,
    inAppPurchases: false,
    subscriptions: false,
    revenueCat: false,
    githubUrl: '',
    localPath: '',
  }
}

export function wizardToApplicationInput(
  wizard: ApplicationWizardState,
): ApplicationInput {
  const form = emptyApplicationForm()
  form.name = wizard.name
  form.status = 'IDEA'
  form.description = wizard.description
  form.category = wizard.category
  form.tags = wizard.tags
  if (wizard.android) {
    form.packageName = wizard.packageName
  }
  if (wizard.ios) {
    form.bundleId = wizard.bundleId
  }
  form.architecture = wizard.architecture
  form.stateManagement = wizard.stateManagement
  if (wizard.backend === 'firebase') {
    form.services = wizard.services.filter((service) =>
      wizardFirebaseServices.some((item) => item === service),
    )
  }
  form.admob = wizard.admob
  form.inAppPurchases = wizard.inAppPurchases
  form.subscriptions = wizard.subscriptions
  form.revenueCat = wizard.revenueCat
  form.githubUrl = wizard.githubUrl
  form.localPath = wizard.localPath
  return toApplicationInput(form)
}
