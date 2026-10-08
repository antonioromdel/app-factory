import { useState, type FormEvent, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Input } from '@/components/Input.tsx'
import { Select } from '@/components/Select.tsx'
import { Switch } from '@/components/Switch.tsx'
import { TextArea } from '@/components/TextArea.tsx'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { KnowledgeErrorCode } from '@/services/knowledgeService.ts'
import { knowledgeCategories } from '@/types/knowledge.ts'
import type { KnowledgeArticleInput } from '@/types/knowledge.ts'
import {
  toKnowledgeInput,
  type KnowledgeFormState,
} from './knowledgeFormState.ts'
import styles from './KnowledgeForm.module.css'

export function KnowledgeForm({
  initial,
  submitLabel,
  errorCode,
  onSubmit,
  onCancel,
}: {
  initial: KnowledgeFormState
  submitLabel: string
  errorCode: KnowledgeErrorCode | null
  onSubmit: (input: KnowledgeArticleInput) => Promise<void>
  onCancel: () => void
}): ReactElement {
  const { messages } = useLanguage()
  const [form, setForm] = useState(initial)
  const [titleError, setTitleError] = useState(false)
  const [categoryError, setCategoryError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function update(patch: Partial<KnowledgeFormState>): void {
    setForm((current) => ({ ...current, ...patch }))
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    const titleMissing = form.title.trim().length === 0
    const categoryMissing = form.category === ''
    setTitleError(titleMissing)
    setCategoryError(categoryMissing)
    const input = toKnowledgeInput(form)
    if (!input) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(input)
    } catch {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <Input
        label={messages.knowledge.title}
        value={form.title}
        error={titleError ? messages.knowledge.enterTitle : undefined}
        disabled={isSubmitting}
        onChange={(event) => {
          update({ title: event.target.value })
          setTitleError(false)
        }}
      />
      <Select
        label={messages.knowledge.category}
        value={form.category}
        disabled={isSubmitting}
        options={[
          { value: '', label: messages.knowledge.chooseCategory },
          ...knowledgeCategories.map((category) => ({
            value: category,
            label: messages.knowledge.categories[category],
          })),
        ]}
        onChange={(event) => {
          const value = event.target.value
          update({
            category: isCategory(value) ? value : '',
          })
          setCategoryError(false)
        }}
      />
      {categoryError ? (
        <p className={styles.error} role="alert">
          {messages.knowledge.chooseCategoryError}
        </p>
      ) : null}
      <Input
        label={messages.knowledge.tags}
        value={form.tags}
        disabled={isSubmitting}
        onChange={(event) => update({ tags: event.target.value })}
      />
      <p className={styles.hint}>{messages.knowledge.tagsHint}</p>
      <TextArea
        label={messages.knowledge.content}
        value={form.content}
        rows={16}
        disabled={isSubmitting}
        onChange={(event) => update({ content: event.target.value })}
      />
      <p className={styles.hint}>{messages.knowledge.markdownHint}</p>
      <Switch
        label={messages.knowledge.favorite}
        checked={form.favorite}
        disabled={isSubmitting}
        onChange={(event) => update({ favorite: event.target.checked })}
      />
      {errorCode ? (
        <ErrorState message={messages.knowledge.errors[errorCode]} />
      ) : null}
      <div className={styles.actions}>
        <Button variant="ghost" disabled={isSubmitting} onClick={onCancel}>
          {messages.common.cancel}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? messages.common.saving : submitLabel}
        </Button>
      </div>
    </form>
  )
}

function isCategory(value: string): value is KnowledgeFormState['category'] {
  return (
    value === '' || knowledgeCategories.some((category) => category === value)
  )
}
