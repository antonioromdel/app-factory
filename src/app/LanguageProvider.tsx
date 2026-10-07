import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { en } from '@/i18n/en.ts'
import { es } from '@/i18n/es.ts'
import { LanguageContext, type Language } from './languageContext.ts'

const storageKey = 'app-factory-language'

const catalogs = { en, es }

export function LanguageProvider({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const [language, setLanguageState] = useState<Language>(readLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    try {
      localStorage.setItem(storageKey, language)
    } catch {
      // The choice still applies for this visit.
    }
  }, [language])

  return (
    <LanguageContext.Provider
      value={{
        language,
        messages: catalogs[language],
        setLanguage: setLanguageState,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

function readLanguage(): Language {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === 'en' || stored === 'es') {
      return stored
    }
  } catch {
    // Fall through to the browser language.
  }

  if (navigator.language.toLowerCase().startsWith('es')) {
    return 'es'
  }

  return 'en'
}
