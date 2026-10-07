import type { ReactElement } from 'react'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { Language } from '@/app/languageContext.ts'
import { Select } from './Select.tsx'

export function LanguageSelect({
  className,
}: {
  className?: string
}): ReactElement {
  const { language, messages, setLanguage } = useLanguage()

  return (
    <Select
      className={className}
      label={messages.language.label}
      value={language}
      options={[
        { value: 'en', label: messages.language.english },
        { value: 'es', label: messages.language.spanish },
      ]}
      onChange={(event) => {
        setLanguage(event.target.value as Language)
      }}
    />
  )
}
