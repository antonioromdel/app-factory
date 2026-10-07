import { createContext } from 'react'
import type { Messages } from '@/i18n/en.ts'

export type Language = 'en' | 'es'

export interface LanguageContextValue {
  language: Language
  messages: Messages
  setLanguage: (language: Language) => void
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)
