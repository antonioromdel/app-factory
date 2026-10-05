import type { ReactElement, ReactNode } from 'react'
import { EmptyState } from '@/components/EmptyState.tsx'

export function PlaceholderPage({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}): ReactElement {
  return <EmptyState title={title} description={description} action={action} />
}
