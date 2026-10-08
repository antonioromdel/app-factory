import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { IconGenerator } from '@/features/assets/IconGenerator.tsx'
import { SplashGenerator } from '@/features/assets/SplashGenerator.tsx'
import { assetSizeLabel } from '@/features/assets/assetDisplay.ts'
import { useApplications } from '@/hooks/useApplications.ts'
import { useAssetIndex } from '@/hooks/useAssetIndex.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { assetCategories } from '@/types/asset.ts'
import styles from './AssetsPage.module.css'

export function AssetsPage(): ReactElement {
  const { messages } = useLanguage()
  const applications = useApplications()
  const ids =
    applications.status === 'ready'
      ? [...applications.applications]
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((application) => application.id)
      : null
  const index = useAssetIndex(ids)
  const named = new Map(
    applications.status === 'ready'
      ? applications.applications.map((application) => [
          application.id,
          application.name,
        ])
      : [],
  )

  return (
    <div className={styles.page}>
      <IconGenerator />
      <SplashGenerator />
      {applications.status === 'loading' ||
      (applications.status === 'ready' && index.status === 'loading') ? (
        <LoadingState message={messages.assets.loading} />
      ) : null}
      {applications.status === 'error' ? (
        <ErrorState
          message={
            messages.applicationErrors[applications.errorCode ?? 'load-list']
          }
          onRetry={applications.reload}
        />
      ) : null}
      {applications.status === 'ready' && index.status === 'error' ? (
        <ErrorState
          message={messages.assets.errors[index.errorCode ?? 'load']}
          onRetry={index.reload}
        />
      ) : null}
      {applications.status === 'ready' && index.status === 'ready' ? (
        <>
          <p className={styles.lead}>{messages.assets.libraryLead}</p>
          {applications.applications.length === 0 ? (
            <EmptyState
              title={messages.assets.noApplicationsTitle}
              description={messages.assets.noApplicationsDescription}
              action={
                <Link className={styles.open} to="/applications/new">
                  {messages.applications.newApplication}
                </Link>
              }
            />
          ) : null}
          {applications.applications.length > 0 && index.assets.length === 0 ? (
            <EmptyState
              title={messages.assets.emptyTitle}
              description={messages.assets.emptyDescription}
              action={
                <Link className={styles.open} to="/applications">
                  {messages.assets.openApplications}
                </Link>
              }
            />
          ) : null}
          {ids?.map((applicationId) => {
            const assets = index.assets
              .filter((item) => item.applicationId === applicationId)
              .sort(
                (left, right) =>
                  assetCategories.indexOf(left.asset.category) -
                    assetCategories.indexOf(right.asset.category) ||
                  left.asset.order - right.asset.order ||
                  left.asset.name.localeCompare(right.asset.name),
              )
            if (assets.length === 0) {
              return null
            }

            return (
              <section key={applicationId} className={styles.group}>
                <div className={styles.header}>
                  <h2 className={styles.title}>{named.get(applicationId)}</h2>
                  <Link
                    className={styles.open}
                    to={`/applications/${applicationId}?tab=assets`}
                  >
                    {messages.assets.openApplication}
                  </Link>
                </div>
                <ul className={styles.list}>
                  {assets.map(({ asset }) => (
                    <li key={asset.id} className={styles.item}>
                      <img
                        className={styles.preview}
                        src={asset.url}
                        alt={asset.name}
                      />
                      <div>
                        <p className={styles.name}>{asset.name}</p>
                        <p className={styles.meta}>
                          {messages.assets.categories[asset.category]}
                          {' · '}
                          {assetSizeLabel(asset.size)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </>
      ) : null}
    </div>
  )
}
