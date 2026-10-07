import { useContext } from 'react'
import {
  LanguageContext,
  type LanguageContextValue,
} from '@/app/languageContext.ts'

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext)

  if (!value) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }

  return value
}
