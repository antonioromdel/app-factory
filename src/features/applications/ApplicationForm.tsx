import { useState, type FormEvent, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { Checkbox } from '@/components/Checkbox.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Input } from '@/components/Input.tsx'
import { Select } from '@/components/Select.tsx'
import { Switch } from '@/components/Switch.tsx'
import { TextArea } from '@/components/TextArea.tsx'
import { ApplicationDataError } from '@/services/applicationService.ts'
import {
  applicationStatuses,
  firebaseServices,
  type ApplicationInput,
  type ApplicationStatus,
  type FirebaseService,
} from '@/types/application.ts'
import { statusLabel } from './applicationDisplay.ts'
import {
  toApplicationInput,
  type ApplicationFormState,
} from './applicationFormState.ts'
import styles from './ApplicationForm.module.css'

const serviceLabels: Record<FirebaseService, string> = {
  authentication: 'Authentication',
  firestore: 'Firestore',
  storage: 'Storage',
  analytics: 'Analytics',
  crashlytics: 'Crashlytics',
  messaging: 'Messaging',
  functions: 'Functions',
  remoteConfig: 'Remote Config',
}

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
  const [form, setForm] = useState(initial)
  const [nameError, setNameError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
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
      setNameError('Enter a name.')
      return
    }

    setNameError(null)
    setIsSubmitting(true)

    try {
      await onSubmit(toApplicationInput(form))
    } catch (error: unknown) {
      setFormError(
        error instanceof ApplicationDataError
          ? error.message
          : 'Could not save the application.',
      )
      setIsSubmitting(false)
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <fieldset className={styles.section} disabled={isSubmitting}>
        <legend className={styles.legend}>Overview</legend>
        <div className={styles.grid}>
          <Input
            className={styles.wide}
            label="Name"
            value={form.name}
            error={nameError ?? undefined}
            onChange={(event) => {
              update({ name: event.target.value })
              setNameError(null)
            }}
          />
          <TextArea
            className={styles.wide}
            label="Description"
            value={form.description}
            onChange={(event) => update({ description: event.target.value })}
          />
          <Select
            label="Status"
            value={form.status}
            options={[
              { value: '', label: 'Not set' },
              ...applicationStatuses.map((status) => ({
                value: status,
                label: statusLabel(status),
              })),
            ]}
            onChange={(event) => {
              update({ status: event.target.value as ApplicationStatus | '' })
            }}
          />
          <Input
            label="Category"
            value={form.category}
            onChange={(event) => update({ category: event.target.value })}
          />
          <Input
            className={styles.wide}
            label="Tags"
            value={form.tags}
            placeholder="Separate tags with commas"
            onChange={(event) => update({ tags: event.target.value })}
          />
        </div>
      </fieldset>

      <fieldset className={styles.section} disabled={isSubmitting}>
        <legend className={styles.legend}>Development</legend>
        <div className={styles.grid}>
          <Input
            label="Flutter version"
            value={form.flutterVersion}
            onChange={(event) => update({ flutterVersion: event.target.value })}
          />
          <Input
            label="Dart version"
            value={form.dartVersion}
            onChange={(event) => update({ dartVersion: event.target.value })}
          />
          <Input
            label="Package name"
            value={form.packageName}
            onChange={(event) => update({ packageName: event.target.value })}
          />
          <Input
            label="Bundle ID"
            value={form.bundleId}
            onChange={(event) => update({ bundleId: event.target.value })}
          />
          <Input
            label="Minimum Android SDK"
            value={form.minimumAndroidSdk}
            onChange={(event) =>
              update({ minimumAndroidSdk: event.target.value })
            }
          />
          <Input
            label="iOS deployment target"
            value={form.iosDeploymentTarget}
            onChange={(event) =>
              update({ iosDeploymentTarget: event.target.value })
            }
          />
          <Input
            label="Architecture"
            value={form.architecture}
            onChange={(event) => update({ architecture: event.target.value })}
          />
          <Input
            label="State management"
            value={form.stateManagement}
            onChange={(event) =>
              update({ stateManagement: event.target.value })
            }
          />
          <Input
            label="GitHub URL"
            value={form.githubUrl}
            onChange={(event) => update({ githubUrl: event.target.value })}
          />
          <Input
            label="Repository name"
            value={form.repositoryName}
            onChange={(event) => update({ repositoryName: event.target.value })}
          />
          <Input
            className={styles.wide}
            label="Local path"
            value={form.localPath}
            onChange={(event) => update({ localPath: event.target.value })}
          />
        </div>
      </fieldset>

      <fieldset className={styles.section} disabled={isSubmitting}>
        <legend className={styles.legend}>Firebase</legend>
        <div className={styles.grid}>
          <Input
            label="Project ID"
            value={form.firebaseProjectId}
            onChange={(event) =>
              update({ firebaseProjectId: event.target.value })
            }
          />
          <Input
            label="Project number"
            value={form.projectNumber}
            onChange={(event) => update({ projectNumber: event.target.value })}
          />
          <Input
            className={styles.wide}
            label="Console URL"
            value={form.firebaseConsoleUrl}
            onChange={(event) =>
              update({ firebaseConsoleUrl: event.target.value })
            }
          />
          <Input
            label="Android app ID"
            value={form.androidAppId}
            onChange={(event) => update({ androidAppId: event.target.value })}
          />
          <Input
            label="iOS app ID"
            value={form.iosAppId}
            onChange={(event) => update({ iosAppId: event.target.value })}
          />
        </div>
        <div className={styles.checks}>
          {firebaseServices.map((service) => (
            <Checkbox
              key={service}
              label={serviceLabels[service]}
              checked={form.services.includes(service)}
              onChange={() => toggleService(service)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.section} disabled={isSubmitting}>
        <legend className={styles.legend}>Monetization</legend>
        <div className={styles.checks}>
          <Switch
            label="AdMob"
            checked={form.admob}
            onChange={(event) => update({ admob: event.target.checked })}
          />
          <Switch
            label="In-app purchases"
            checked={form.inAppPurchases}
            onChange={(event) =>
              update({ inAppPurchases: event.target.checked })
            }
          />
          <Switch
            label="Subscriptions"
            checked={form.subscriptions}
            onChange={(event) =>
              update({ subscriptions: event.target.checked })
            }
          />
          <Switch
            label="RevenueCat"
            checked={form.revenueCat}
            onChange={(event) => update({ revenueCat: event.target.checked })}
          />
        </div>
        <div className={styles.grid}>
          <Input
            label="AdMob app ID"
            value={form.admobAppId}
            onChange={(event) => update({ admobAppId: event.target.value })}
          />
          <Input
            label="Banner ID"
            value={form.bannerId}
            onChange={(event) => update({ bannerId: event.target.value })}
          />
          <Input
            label="Interstitial ID"
            value={form.interstitialId}
            onChange={(event) => update({ interstitialId: event.target.value })}
          />
          <Input
            label="Rewarded ID"
            value={form.rewardedId}
            onChange={(event) => update({ rewardedId: event.target.value })}
          />
          <Input
            label="Native ID"
            value={form.nativeId}
            onChange={(event) => update({ nativeId: event.target.value })}
          />
        </div>
      </fieldset>

      <fieldset className={styles.section} disabled={isSubmitting}>
        <legend className={styles.legend}>Stores</legend>
        <div className={styles.grid}>
          <Input
            label="Play Console URL"
            value={form.playConsoleUrl}
            onChange={(event) => update({ playConsoleUrl: event.target.value })}
          />
          <Input
            label="Play Store URL"
            value={form.playStoreUrl}
            onChange={(event) => update({ playStoreUrl: event.target.value })}
          />
          <Input
            label="Play version"
            value={form.playVersion}
            onChange={(event) => update({ playVersion: event.target.value })}
          />
          <Input
            label="Play track"
            value={form.playTrack}
            onChange={(event) => update({ playTrack: event.target.value })}
          />
          <Input
            label="App Store Connect URL"
            value={form.appStoreConnectUrl}
            onChange={(event) =>
              update({ appStoreConnectUrl: event.target.value })
            }
          />
          <Input
            label="App Store URL"
            value={form.appStoreUrl}
            onChange={(event) => update({ appStoreUrl: event.target.value })}
          />
          <Input
            label="App Store version"
            value={form.appStoreVersion}
            onChange={(event) =>
              update({ appStoreVersion: event.target.value })
            }
          />
          <Input
            label="TestFlight URL"
            value={form.testFlightUrl}
            onChange={(event) => update({ testFlightUrl: event.target.value })}
          />
        </div>
      </fieldset>

      <fieldset className={styles.section} disabled={isSubmitting}>
        <legend className={styles.legend}>Notes</legend>
        <TextArea
          label="Technical notes"
          value={form.technicalNotes}
          onChange={(event) => update({ technicalNotes: event.target.value })}
        />
        <TextArea
          label="Known issues"
          value={form.knownIssues}
          onChange={(event) => update({ knownIssues: event.target.value })}
        />
        <TextArea
          label="Ideas"
          value={form.ideas}
          onChange={(event) => update({ ideas: event.target.value })}
        />
      </fieldset>

      {formError ? <ErrorState message={formError} /> : null}
      <div className={styles.actions}>
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
