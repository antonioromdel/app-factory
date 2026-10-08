import { useId, useState, type FormEvent, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Input } from '@/components/Input.tsx'
import { Switch } from '@/components/Switch.tsx'
import { TextArea } from '@/components/TextArea.tsx'
import { useKnowledgeArticles } from '@/hooks/useKnowledgeArticles.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { KnowledgeErrorCode } from '@/services/knowledgeService.ts'
import type { KnowledgeArticleInput } from '@/types/knowledge.ts'
import {
  knowledgeCategoryLabel,
  sortKnowledgeCategories,
  uniqueKnowledgeCategories,
} from './knowledgeDisplay.ts'
import {
  toKnowledgeInput,
  type KnowledgeFormState,
} from './knowledgeFormState.ts'
import { libraryArticles } from './knowledgeLibrary.ts'
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
  const { language, messages } = useLanguage()
  const userArticles = useKnowledgeArticles()
  const categoryListId = useId()
  const suggestions = sortKnowledgeCategories(
    uniqueKnowledgeCategories([
      ...libraryArticles(language).map((article) => article.category),
      ...userArticles.articles.map((article) => article.category),
    ]),
    messages.knowledge.categories,
    language,
  )
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
    const categoryMissing = form.category.trim().length === 0
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
      <Input
        label={messages.knowledge.category}
        value={form.category}
        list={categoryListId}
        placeholder={messages.knowledge.chooseCategory}
        error={
          categoryError ? messages.knowledge.chooseCategoryError : undefined
        }
        disabled={isSubmitting}
        onChange={(event) => {
          update({ category: event.target.value })
          setCategoryError(false)
        }}
      />
      <datalist id={categoryListId}>
        {suggestions.map((category) => (
          <option key={category} value={category}>
            {knowledgeCategoryLabel(category, messages.knowledge.categories)}
          </option>
        ))}
      </datalist>
      <p className={styles.hint}>{messages.knowledge.categoryHint}</p>
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
