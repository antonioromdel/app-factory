import {
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

export interface FirebaseServices {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

type FirebaseEnvName =
  | 'VITE_FIREBASE_API_KEY'
  | 'VITE_FIREBASE_AUTH_DOMAIN'
  | 'VITE_FIREBASE_PROJECT_ID'
  | 'VITE_FIREBASE_STORAGE_BUCKET'
  | 'VITE_FIREBASE_MESSAGING_SENDER_ID'
  | 'VITE_FIREBASE_APP_ID'

let services: FirebaseServices | null = null

export function getFirebaseServices(): FirebaseServices {
  if (services) {
    return services
  }

  const config = readFirebaseConfig()
  const app = initializeApp(config)

  services = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
  }

  return services
}

function readFirebaseConfig(): FirebaseOptions {
  const apiKey = readEnv('VITE_FIREBASE_API_KEY')
  const authDomain = readEnv('VITE_FIREBASE_AUTH_DOMAIN')
  const projectId = readEnv('VITE_FIREBASE_PROJECT_ID')
  const storageBucket = readEnv('VITE_FIREBASE_STORAGE_BUCKET')
  const messagingSenderId = readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID')
  const appId = readEnv('VITE_FIREBASE_APP_ID')

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  }
}

function readEnv(name: FirebaseEnvName): string {
  const value = import.meta.env[name]

  if (!value || value === '...') {
    throw new Error(`Missing Firebase configuration: ${name}`)
  }

  return value
}
