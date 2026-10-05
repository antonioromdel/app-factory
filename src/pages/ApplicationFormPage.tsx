import type { ReactElement } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { ApplicationForm } from '@/features/applications/ApplicationForm.tsx'
import {
  emptyApplicationForm,
  formFromApplication,
} from '@/features/applications/applicationFormState.ts'
import { useApplication } from '@/hooks/useApplication.ts'
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
    <ApplicationForm
      initial={emptyApplicationForm()}
      submitLabel="Create application"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/applications')}
    />
  )
}

export function ApplicationEditPage(): ReactElement {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const { status, application, errorMessage, reload } =
    useApplication(applicationId)

  if (status === 'loading') {
    return <LoadingState message="Loading application…" />
  }

  if (status === 'error') {
    return (
      <ErrorState
        message={errorMessage ?? 'Could not load the application.'}
        onRetry={reload}
      />
    )
  }

  if (status === 'missing' || !application) {
    return (
      <EmptyState
        title="Application not found"
        action={<Link to="/applications">Back to applications</Link>}
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
      submitLabel="Save changes"
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/applications/${application.id}`)}
    />
  )
}
