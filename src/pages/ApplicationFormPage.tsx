import type { ReactElement } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { ApplicationForm } from '@/features/applications/ApplicationForm.tsx'
import { ApplicationWizard } from '@/features/applications/ApplicationWizard.tsx'
import { formFromApplication } from '@/features/applications/applicationFormState.ts'
import { useApplication } from '@/hooks/useApplication.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  createApplication,
  updateApplication,
} from '@/services/applicationService.ts'
import type { ApplicationInput } from '@/types/application.ts'

export function ApplicationCreatePage(): ReactElement {
  const navigate = useNavigate()

  async function handleSubmit(input: ApplicationInput): Promise<void> {
    const id = await createApplication(input)
    navigate(`/applications/${id}`)
  }

  return (
    <ApplicationWizard
      onSubmit={handleSubmit}
      onCancel={() => navigate('/applications')}
    />
  )
}

export function ApplicationEditPage(): ReactElement {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const { messages } = useLanguage()
  const { status, application, errorCode, reload } =
    useApplication(applicationId)

  if (status === 'loading') {
    return <LoadingState message={messages.common.loadingApplication} />
  }

  if (status === 'error') {
    return (
      <ErrorState
        message={messages.applicationErrors[errorCode ?? 'load-one']}
        onRetry={reload}
      />
    )
  }

  if (status === 'missing' || !application) {
    return (
      <EmptyState
        title={messages.common.applicationNotFound}
        action={
          <Link to="/applications">{messages.common.backToApplications}</Link>
        }
      />
    )
  }

  async function handleSubmit(input: ApplicationInput): Promise<void> {
    if (!application) {
      return
    }

    await updateApplication(application.id, input)
    navigate(`/applications/${application.id}`)
  }

  return (
    <ApplicationForm
      key={application.id}
      initial={formFromApplication(application)}
      submitLabel={messages.form.saveChanges}
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/applications/${application.id}`)}
    />
  )
}
