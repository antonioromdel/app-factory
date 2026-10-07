import { useState, type FormEvent, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { Checkbox } from '@/components/Checkbox.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Input } from '@/components/Input.tsx'
import { Select } from '@/components/Select.tsx'
import { Switch } from '@/components/Switch.tsx'
import { TextArea } from '@/components/TextArea.tsx'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  applicationErrorCode,
  type ApplicationErrorCode,
} from '@/services/applicationService.ts'
import {
  applicationStatuses,
  firebaseServices,
  type ApplicationInput,
  type ApplicationStatus,
  type FirebaseService,
} from '@/types/application.ts'
import {
  toApplicationInput,
  type ApplicationFormState,
} from './applicationFormState.ts'
import styles from './ApplicationForm.module.css'

export function ApplicationForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ApplicationFormState
  submitLabel: string
  onSubmit: (input: ApplicationInput) => Promise<void>
  onCancel: () => void
}): ReactElement {
  const { messages } = useLanguage()
  const [form, setForm] = useState(initial)
  const [nameError, setNameError] = useState(false)
  const [formError, setFormError] = useState<ApplicationErrorCode | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function update(patch: Partial<ApplicationFormState>): void {
    setForm((current) => ({ ...current, ...patch }))
  }

  function toggleService(service: FirebaseService): void {
    setForm((current) => ({
      ...current,
      services: current.services.includes(service)
        ? current.services.filter((item) => item !== service)
        : [...current.services, service],
    }))
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setFormError(null)

    if (!form.name.trim()) {
      setNameError(true)
      return
    }

    setNameError(false)
    setIsSubmitting(true)

    try {
      await onSubmit(toApplicationInput(form))
    } catch (error: unknown) {
      setFormError(applicationErrorCode(error, 'save'))
      setIsSubmitting(false)
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <fieldset className={styles.section} disabled={isSubmitting}>
        <legend className={styles.legend}>{messages.fields.overview}</legend>
        <div className={styles.grid}>
          <Input
            className={styles.wide}
            label={messages.common.name}
            value={form.name}
            error={nameError ? messages.common.enterName : undefined}
            onChange={(event) => {
              update({ name: event.target.value })
              setNameError(false)
            }}
          />
          <TextArea
            className={styles.wide}
            label={messages.common.description}
            value={form.description}
            onChange={(event) => update({ description: event.target.value })}
          />
          <Select
            label={messages.fields.status}
            value={form.status}
            options={[
              { value: '', label: messages.common.notSet },
              ...applicationStatuses.map((status) => ({
                value: status,
                label: messages.status[status],
              })),
            ]}
            onChange={(event) => {
              update({ status: event.target.value as ApplicationStatus | '' })
            }}
          />
          <Input
            label={messages.common.category}
            value={form.category}
            onChange={(event) => update({ category: event.target.value })}
          />
          <Input
            className={styles.wide}
            label={messages.common.tags}
            value={form.tags}
            placeholder={messages.common.tagsPlaceholder}
            onChange={(event) => update({ tags: event.target.value })}
          />
        </div>
      </fieldset>

      <fieldset className={styles.section} disabled={isSubmitting}>
        <legend className={styles.legend}>{messages.fields.development}</legend>
        <div className={styles.grid}>
          <Input
            label={messages.fields.flutterVersion}
            value={form.flutterVersion}
            onChange={(event) => update({ flutterVersion: event.target.value })}
          />
          <Input
            label={messages.fields.dartVersion}
            value={form.dartVersion}
            onChange={(event) => update({ dartVersion: event.target.value })}
          />
          <Input
            label={messages.fields.packageName}
            value={form.packageName}
            onChange={(event) => update({ packageName: event.target.value })}
          />
          <Input
            label={messages.fields.bundleId}
            value={form.bundleId}
            onChange={(event) => update({ bundleId: event.target.value })}
          />
          <Input
            label={messages.fields.minimumAndroidSdk}
            value={form.minimumAndroidSdk}
            onChange={(event) =>
              update({ minimumAndroidSdk: event.target.value })
            }
          />
          <Input
            label={messages.fields.iosDeploymentTarget}
            value={form.iosDeploymentTarget}
            onChange={(event) =>
              update({ iosDeploymentTarget: event.target.value })
            }
          />
          <Input
            label={messages.fields.architecture}
            value={form.architecture}
            onChange={(event) => update({ architecture: event.target.value })}
          />
          <Input
            label={messages.fields.stateManagement}
            value={form.stateManagement}
            onChange={(event) =>
              update({ stateManagement: event.target.value })
            }
          />
          <Input
            label={messages.fields.githubUrl}
            value={form.githubUrl}
            onChange={(event) => update({ githubUrl: event.target.value })}
          />
          <Input
            label={messages.fields.repositoryName}
            value={form.repositoryName}
            onChange={(event) => update({ repositoryName: event.target.value })}
          />
          <Input
            className={styles.wide}
            label={messages.fields.localPath}
            value={form.localPath}
            onChange={(event) => update({ localPath: event.target.value })}
          />
        </div>
      </fieldset>

      <fieldset className={styles.section} disabled={isSubmitting}>
        <legend className={styles.legend}>{messages.fields.firebase}</legend>
        <div className={styles.grid}>
          <Input
            label={messages.fields.projectId}
            value={form.firebaseProjectId}
            onChange={(event) =>
              update({ firebaseProjectId: event.target.value })
            }
          />
          <Input
            label={messages.fields.projectNumber}
            value={form.projectNumber}
            onChange={(event) => update({ projectNumber: event.target.value })}
          />
          <Input
            className={styles.wide}
            label={messages.fields.consoleUrl}
            value={form.firebaseConsoleUrl}
            onChange={(event) =>
              update({ firebaseConsoleUrl: event.target.value })
            }
          />
          <Input
            label={messages.fields.androidAppId}
            value={form.androidAppId}
            onChange={(event) => update({ androidAppId: event.target.value })}
          />
          <Input
            label={messages.fields.iosAppId}
            value={form.iosAppId}
            onChange={(event) => update({ iosAppId: event.target.value })}
          />
        </div>
        <div className={styles.checks}>
          {firebaseServices.map((service) => (
            <Checkbox
              key={service}
              label={messages.services[service]}
              checked={form.services.includes(service)}
              onChange={() => toggleService(service)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.section} disabled={isSubmitting}>
        <legend className={styles.legend}>
          {messages.fields.monetization}
        </legend>
        <div className={styles.checks}>
          <Switch
            label={messages.fields.admob}
            checked={form.admob}
            onChange={(event) => update({ admob: event.target.checked })}
          />
          <Switch
            label={messages.fields.inAppPurchases}
            checked={form.inAppPurchases}
            onChange={(event) =>
              update({ inAppPurchases: event.target.checked })
            }
          />
          <Switch
            label={messages.fields.subscriptions}
            checked={form.subscriptions}
            onChange={(event) =>
              update({ subscriptions: event.target.checked })
            }
          />
          <Switch
            label={messages.fields.revenueCat}
            checked={form.revenueCat}
            onChange={(event) => update({ revenueCat: event.target.checked })}
          />
        </div>
        <div className={styles.grid}>
          <Input
            label={messages.fields.admobConsoleUrl}
            value={form.admobConsoleUrl}
            onChange={(event) =>
              update({ admobConsoleUrl: event.target.value })
            }
          />
          <Input
            label={messages.fields.admobAppId}
            value={form.admobAppId}
            onChange={(event) => update({ admobAppId: event.target.value })}
          />
          <Input
            label={messages.fields.bannerId}
            value={form.bannerId}
            onChange={(event) => update({ bannerId: event.target.value })}
          />
          <Input
            label={messages.fields.interstitialId}
            value={form.interstitialId}
            onChange={(event) => update({ interstitialId: event.target.value })}
          />
          <Input
            label={messages.fields.rewardedId}
            value={form.rewardedId}
            onChange={(event) => update({ rewardedId: event.target.value })}
          />
          <Input
            label={messages.fields.nativeId}
            value={form.nativeId}
            onChange={(event) => update({ nativeId: event.target.value })}
          />
          <Input
            label={messages.fields.revenueCatUrl}
            value={form.revenueCatUrl}
            onChange={(event) => update({ revenueCatUrl: event.target.value })}
          />
        </div>
      </fieldset>

      <fieldset className={styles.section} disabled={isSubmitting}>
        <legend className={styles.legend}>{messages.fields.stores}</legend>
        <div className={styles.grid}>
          <Input
            label={messages.fields.playConsoleUrl}
            value={form.playConsoleUrl}
            onChange={(event) => update({ playConsoleUrl: event.target.value })}
          />
          <Input
            label={messages.fields.playStoreUrl}
            value={form.playStoreUrl}
            onChange={(event) => update({ playStoreUrl: event.target.value })}
          />
          <Input
            label={messages.fields.playVersion}
            value={form.playVersion}
            onChange={(event) => update({ playVersion: event.target.value })}
          />
          <Input
            label={messages.fields.playTrack}
            value={form.playTrack}
            onChange={(event) => update({ playTrack: event.target.value })}
          />
          <Input
            label={messages.fields.appStoreConnectUrl}
            value={form.appStoreConnectUrl}
            onChange={(event) =>
              update({ appStoreConnectUrl: event.target.value })
            }
          />
          <Input
            label={messages.fields.appStoreUrl}
            value={form.appStoreUrl}
            onChange={(event) => update({ appStoreUrl: event.target.value })}
          />
          <Input
            label={messages.fields.appStoreVersion}
            value={form.appStoreVersion}
            onChange={(event) =>
              update({ appStoreVersion: event.target.value })
            }
          />
          <Input
            label={messages.fields.testFlightUrl}
            value={form.testFlightUrl}
            onChange={(event) => update({ testFlightUrl: event.target.value })}
          />
        </div>
      </fieldset>

      <fieldset className={styles.section} disabled={isSubmitting}>
        <legend className={styles.legend}>{messages.fields.notes}</legend>
        <TextArea
          label={messages.fields.technicalNotes}
          value={form.technicalNotes}
          onChange={(event) => update({ technicalNotes: event.target.value })}
        />
        <TextArea
          label={messages.fields.knownIssues}
          value={form.knownIssues}
          onChange={(event) => update({ knownIssues: event.target.value })}
        />
        <TextArea
          label={messages.fields.ideas}
          value={form.ideas}
          onChange={(event) => update({ ideas: event.target.value })}
        />
      </fieldset>

      {formError ? (
        <ErrorState message={messages.applicationErrors[formError]} />
      ) : null}
      <div className={styles.actions}>
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? messages.common.saving : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {messages.common.cancel}
        </Button>
      </div>
    </form>
  )
}
