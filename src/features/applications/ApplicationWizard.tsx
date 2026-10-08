import { useRef, useState, type FormEvent, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { Checkbox } from '@/components/Checkbox.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Input } from '@/components/Input.tsx'
import { Switch } from '@/components/Switch.tsx'
import { TextArea } from '@/components/TextArea.tsx'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { Messages } from '@/i18n/en.ts'
import {
  applicationErrorCode,
  type ApplicationErrorCode,
} from '@/services/applicationService.ts'
import {
  assignChecklistTemplate,
  checklistErrorCode,
  type ChecklistErrorCode,
} from '@/services/checklistService.ts'
import type { ApplicationInput, FirebaseService } from '@/types/application.ts'
import {
  checklistTemplateIds,
  templateItemIds,
  type ChecklistTemplateId,
} from '@/types/checklistTemplates.ts'
import {
  emptyApplicationWizard,
  wizardFirebaseServices,
  wizardToApplicationInput,
  type ApplicationWizardState,
  type WizardBackend,
} from './applicationWizardState.ts'
import styles from './ApplicationWizard.module.css'

const steps = [
  'basics',
  'platforms',
  'flutter',
  'backend',
  'monetization',
  'repository',
  'template',
  'review',
] as const

type WizardStep = (typeof steps)[number]

type WizardError =
  | { source: 'application'; code: ApplicationErrorCode }
  | { source: 'checklist'; code: ChecklistErrorCode }

function wizardStepLabel(step: WizardStep, messages: Messages): string {
  return messages.wizard[step]
}

export function ApplicationWizard({
  onCreate,
  onCreated,
  onCancel,
}: {
  onCreate: (input: ApplicationInput) => Promise<string>
  onCreated: (id: string) => void
  onCancel: () => void
}): ReactElement {
  const { messages } = useLanguage()
  const createdId = useRef<string | null>(null)
  const [step, setStep] = useState(0)
  const [wizard, setWizard] = useState(emptyApplicationWizard)
  const [nameError, setNameError] = useState(false)
  const [formError, setFormError] = useState<WizardError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const current = steps[step] ?? steps[0]
  const stepLabel = wizardStepLabel(current, messages)
  const isReview = step === steps.length - 1

  function update(patch: Partial<ApplicationWizardState>): void {
    setWizard((currentState) => ({ ...currentState, ...patch }))
  }

  function toggleService(service: FirebaseService): void {
    setWizard((currentState) => ({
      ...currentState,
      services: currentState.services.includes(service)
        ? currentState.services.filter((item) => item !== service)
        : [...currentState.services, service],
    }))
  }

  function goNext(): void {
    if (step === 0 && !wizard.name.trim()) {
      setNameError(true)
      return
    }

    setNameError(false)
    setFormError(null)
    setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1))
  }

  function goBack(): void {
    setFormError(null)
    setStep((currentStep) => Math.max(currentStep - 1, 0))
  }

  async function createApplicationRecord(): Promise<void> {
    if (!wizard.name.trim()) {
      setNameError(true)
      setStep(0)
      return
    }

    setFormError(null)
    setIsSubmitting(true)

    try {
      const id =
        createdId.current ?? (await onCreate(wizardToApplicationInput(wizard)))
      createdId.current = id
      await assignChecklistTemplate(id, wizard.template)
      onCreated(id)
    } catch (error: unknown) {
      setFormError(
        createdId.current
          ? { source: 'checklist', code: checklistErrorCode(error, 'copy') }
          : {
              source: 'application',
              code: applicationErrorCode(error, 'create'),
            },
      )
      setIsSubmitting(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (isReview) {
      void createApplicationRecord()
      return
    }

    goNext()
  }

  return (
    <form className={styles.wizard} onSubmit={handleSubmit}>
      <ol className={styles.steps} aria-label={messages.wizard.stepsLabel}>
        {steps.map((item, index) => (
          <li key={item}>
            {index < step ? (
              <button
                className={styles.step}
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setFormError(null)
                  setStep(index)
                }}
              >
                {wizardStepLabel(item, messages)}
              </button>
            ) : (
              <span
                className={
                  index === step
                    ? `${styles.step} ${styles.current}`
                    : `${styles.step} ${styles.upcoming}`
                }
                aria-current={index === step ? 'step' : undefined}
              >
                {wizardStepLabel(item, messages)}
              </span>
            )}
          </li>
        ))}
      </ol>

      <fieldset className={styles.section} disabled={isSubmitting}>
        <legend className={styles.legend}>{stepLabel}</legend>
        <p className={styles.progress}>
          {messages.wizard.progress(step + 1, steps.length)}
        </p>
        {current === 'basics' ? (
          <Basics
            wizard={wizard}
            nameError={nameError ? messages.common.enterName : null}
            onChange={update}
            onNameChange={(name) => {
              update({ name })
              setNameError(false)
            }}
          />
        ) : null}
        {current === 'platforms' ? (
          <Platforms wizard={wizard} onChange={update} />
        ) : null}
        {current === 'flutter' ? (
          <Flutter wizard={wizard} onChange={update} />
        ) : null}
        {current === 'backend' ? (
          <Backend
            wizard={wizard}
            onChange={update}
            onToggleService={toggleService}
          />
        ) : null}
        {current === 'monetization' ? (
          <Monetization wizard={wizard} onChange={update} />
        ) : null}
        {current === 'repository' ? (
          <Repository wizard={wizard} onChange={update} />
        ) : null}
        {current === 'template' ? (
          <TemplateStep wizard={wizard} onChange={update} />
        ) : null}
        {current === 'review' ? <Review wizard={wizard} /> : null}
      </fieldset>

      {formError ? (
        <ErrorState
          message={
            formError.source === 'checklist'
              ? messages.checklist.errors[formError.code]
              : messages.applicationErrors[formError.code]
          }
        />
      ) : null}

      <div className={styles.actions}>
        <Button variant="ghost" disabled={isSubmitting} onClick={onCancel}>
          {messages.common.cancel}
        </Button>
        {step > 0 ? (
          <Button variant="secondary" disabled={isSubmitting} onClick={goBack}>
            {messages.common.back}
          </Button>
        ) : null}
        {isReview ? (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? messages.wizard.creating : messages.wizard.create}
          </Button>
        ) : (
          <Button type="submit">{messages.common.next}</Button>
        )}
      </div>
    </form>
  )
}

function Basics({
  wizard,
  nameError,
  onChange,
  onNameChange,
}: {
  wizard: ApplicationWizardState
  nameError: string | null
  onChange: (patch: Partial<ApplicationWizardState>) => void
  onNameChange: (name: string) => void
}): ReactElement {
  const { messages } = useLanguage()

  return (
    <div className={styles.grid}>
      <p className={`${styles.note} ${styles.wide}`}>
        {messages.wizard.basicsNote}
      </p>
      <Input
        className={styles.wide}
        label={messages.common.name}
        value={wizard.name}
        error={nameError ?? undefined}
        onChange={(event) => onNameChange(event.target.value)}
      />
      <TextArea
        className={styles.wide}
        label={messages.common.description}
        value={wizard.description}
        onChange={(event) => onChange({ description: event.target.value })}
      />
      <Input
        label={messages.common.category}
        value={wizard.category}
        onChange={(event) => onChange({ category: event.target.value })}
      />
      <Input
        label={messages.common.tags}
        value={wizard.tags}
        placeholder={messages.common.tagsPlaceholder}
        onChange={(event) => onChange({ tags: event.target.value })}
      />
    </div>
  )
}

function Platforms({
  wizard,
  onChange,
}: {
  wizard: ApplicationWizardState
  onChange: (patch: Partial<ApplicationWizardState>) => void
}): ReactElement {
  const { messages } = useLanguage()

  return (
    <div className={styles.stack}>
      <p className={styles.note}>{messages.wizard.platformsNote}</p>
      <div className={styles.checks}>
        <Checkbox
          label={messages.common.android}
          checked={wizard.android}
          onChange={(event) => onChange({ android: event.target.checked })}
        />
        <Checkbox
          label={messages.common.ios}
          checked={wizard.ios}
          onChange={(event) => onChange({ ios: event.target.checked })}
        />
      </div>
    </div>
  )
}

function Flutter({
  wizard,
  onChange,
}: {
  wizard: ApplicationWizardState
  onChange: (patch: Partial<ApplicationWizardState>) => void
}): ReactElement {
  const { messages } = useLanguage()

  return (
    <div className={styles.grid}>
      {!wizard.android && !wizard.ios ? (
        <p className={`${styles.note} ${styles.wide}`}>
          {messages.wizard.flutterSkipped}
        </p>
      ) : null}
      {wizard.android ? (
        <Input
          label={messages.fields.packageName}
          value={wizard.packageName}
          onChange={(event) => onChange({ packageName: event.target.value })}
        />
      ) : null}
      {wizard.ios ? (
        <Input
          label={messages.fields.bundleId}
          value={wizard.bundleId}
          onChange={(event) => onChange({ bundleId: event.target.value })}
        />
      ) : null}
      <Input
        label={messages.fields.architecture}
        value={wizard.architecture}
        onChange={(event) => onChange({ architecture: event.target.value })}
      />
      <Input
        label={messages.fields.stateManagement}
        value={wizard.stateManagement}
        onChange={(event) => onChange({ stateManagement: event.target.value })}
      />
    </div>
  )
}

function Backend({
  wizard,
  onChange,
  onToggleService,
}: {
  wizard: ApplicationWizardState
  onChange: (patch: Partial<ApplicationWizardState>) => void
  onToggleService: (service: FirebaseService) => void
}): ReactElement {
  const { messages } = useLanguage()

  return (
    <div className={styles.stack}>
      <fieldset className={styles.choice}>
        <legend className={styles.choiceLegend}>
          {messages.wizard.backendLegend}
        </legend>
        <label className={styles.radio}>
          <input
            type="radio"
            name="backend"
            value="none"
            checked={wizard.backend === 'none'}
            onChange={() =>
              onChange({ backend: 'none' satisfies WizardBackend })
            }
          />
          {messages.wizard.noBackend}
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name="backend"
            value="firebase"
            checked={wizard.backend === 'firebase'}
            onChange={() =>
              onChange({ backend: 'firebase' satisfies WizardBackend })
            }
          />
          {messages.wizard.firebase}
        </label>
      </fieldset>
      {wizard.backend === 'firebase' ? (
        <div className={styles.checks}>
          {wizardFirebaseServices.map((service) => (
            <Checkbox
              key={service}
              label={messages.services[service]}
              checked={wizard.services.includes(service)}
              onChange={() => onToggleService(service)}
            />
          ))}
        </div>
      ) : (
        <p className={styles.note}>{messages.wizard.noServicesStored}</p>
      )}
    </div>
  )
}

function Monetization({
  wizard,
  onChange,
}: {
  wizard: ApplicationWizardState
  onChange: (patch: Partial<ApplicationWizardState>) => void
}): ReactElement {
  const { messages } = useLanguage()

  return (
    <div className={styles.stack}>
      <p className={styles.note}>{messages.wizard.monetizationNote}</p>
      <div className={styles.checks}>
        <Switch
          label={messages.fields.admob}
          checked={wizard.admob}
          onChange={(event) => onChange({ admob: event.target.checked })}
        />
        <Switch
          label={messages.fields.inAppPurchases}
          checked={wizard.inAppPurchases}
          onChange={(event) =>
            onChange({ inAppPurchases: event.target.checked })
          }
        />
        <Switch
          label={messages.fields.subscriptions}
          checked={wizard.subscriptions}
          onChange={(event) =>
            onChange({ subscriptions: event.target.checked })
          }
        />
        <Switch
          label={messages.fields.revenueCat}
          checked={wizard.revenueCat}
          onChange={(event) => onChange({ revenueCat: event.target.checked })}
        />
      </div>
    </div>
  )
}

function Repository({
  wizard,
  onChange,
}: {
  wizard: ApplicationWizardState
  onChange: (patch: Partial<ApplicationWizardState>) => void
}): ReactElement {
  const { messages } = useLanguage()

  return (
    <div className={styles.grid}>
      <Input
        className={styles.wide}
        label={messages.fields.githubRepository}
        value={wizard.githubUrl}
        onChange={(event) => onChange({ githubUrl: event.target.value })}
      />
      <Input
        className={styles.wide}
        label={messages.fields.localPath}
        value={wizard.localPath}
        onChange={(event) => onChange({ localPath: event.target.value })}
      />
    </div>
  )
}

function TemplateStep({
  wizard,
  onChange,
}: {
  wizard: ApplicationWizardState
  onChange: (patch: Partial<ApplicationWizardState>) => void
}): ReactElement {
  const { messages } = useLanguage()

  return (
    <fieldset className={styles.templateChoices}>
      <legend className={styles.choiceLegend}>
        {messages.wizard.templateNote}
      </legend>
      {checklistTemplateIds.map((templateId) => (
        <label key={templateId} className={styles.templateChoice}>
          <input
            type="radio"
            name="checklist-template"
            value={templateId}
            checked={wizard.template === templateId}
            onChange={() =>
              onChange({ template: templateId satisfies ChecklistTemplateId })
            }
          />
          <span className={styles.templateName}>
            {messages.checklist.templates[templateId]}
          </span>
          <span className={styles.templateMeta}>
            {messages.checklist.templateDescriptions[templateId]}
          </span>
          <span className={styles.templateMeta}>
            {messages.checklist.taskCount(templateItemIds(templateId).length)}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

function Review({ wizard }: { wizard: ApplicationWizardState }): ReactElement {
  const { messages } = useLanguage()
  const services = wizardFirebaseServices
    .filter((service) => wizard.services.includes(service))
    .map((service) => messages.services[service])
  const blank = (value: string) => shown(value, messages.common.notSet)

  return (
    <div className={styles.stack}>
      <p className={styles.note}>{messages.wizard.reviewNote}</p>
      <ReviewGroup
        title={messages.wizard.template}
        rows={[
          {
            label: messages.wizard.template,
            value: messages.checklist.templates[wizard.template],
          },
          {
            label: messages.fields.checklist,
            value: messages.checklist.taskCount(
              templateItemIds(wizard.template).length,
            ),
          },
        ]}
      />
      <ReviewGroup
        title={messages.wizard.basics}
        rows={[
          { label: messages.common.name, value: blank(wizard.name) },
          { label: messages.fields.status, value: messages.status.IDEA },
          {
            label: messages.common.description,
            value: blank(wizard.description),
          },
          { label: messages.common.category, value: blank(wizard.category) },
          { label: messages.common.tags, value: blank(wizard.tags) },
        ]}
      />
      <ReviewGroup
        title={messages.wizard.platforms}
        rows={[
          {
            label: messages.common.android,
            value: wizard.android ? messages.common.yes : messages.common.no,
          },
          {
            label: messages.common.ios,
            value: wizard.ios ? messages.common.yes : messages.common.no,
          },
        ]}
      />
      <ReviewGroup
        title={messages.wizard.flutter}
        rows={[
          ...(wizard.android
            ? [
                {
                  label: messages.fields.packageName,
                  value: blank(wizard.packageName),
                },
              ]
            : []),
          ...(wizard.ios
            ? [
                {
                  label: messages.fields.bundleId,
                  value: blank(wizard.bundleId),
                },
              ]
            : []),
          {
            label: messages.fields.architecture,
            value: blank(wizard.architecture),
          },
          {
            label: messages.fields.stateManagement,
            value: blank(wizard.stateManagement),
          },
        ]}
      />
      <ReviewGroup
        title={messages.wizard.backend}
        rows={[
          {
            label: messages.wizard.backendLegend,
            value:
              wizard.backend === 'firebase'
                ? messages.wizard.firebase
                : messages.wizard.noBackend,
          },
          ...(wizard.backend === 'firebase'
            ? [
                {
                  label: messages.fields.services,
                  value:
                    services.length > 0
                      ? services.join(', ')
                      : messages.common.none,
                },
              ]
            : []),
        ]}
      />
      <ReviewGroup
        title={messages.wizard.monetization}
        rows={[
          {
            label: messages.fields.admob,
            value: wizard.admob ? messages.common.on : messages.common.off,
          },
          {
            label: messages.fields.inAppPurchases,
            value: wizard.inAppPurchases
              ? messages.common.on
              : messages.common.off,
          },
          {
            label: messages.fields.subscriptions,
            value: wizard.subscriptions
              ? messages.common.on
              : messages.common.off,
          },
          {
            label: messages.fields.revenueCat,
            value: wizard.revenueCat ? messages.common.on : messages.common.off,
          },
        ]}
      />
      <ReviewGroup
        title={messages.wizard.repository}
        rows={[
          {
            label: messages.fields.githubRepository,
            value: blank(wizard.githubUrl),
          },
          {
            label: messages.fields.localPath,
            value: blank(wizard.localPath),
          },
        ]}
      />
    </div>
  )
}

function ReviewGroup({
  title,
  rows,
}: {
  title: string
  rows: Array<{ label: string; value: string }>
}): ReactElement {
  return (
    <section className={styles.review}>
      <h3 className={styles.reviewTitle}>{title}</h3>
      <dl className={styles.fields}>
        {rows.map((row) => (
          <div key={row.label} className={styles.field}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function shown(value: string, empty: string): string {
  const trimmed = value.trim()
  return trimmed || empty
}
