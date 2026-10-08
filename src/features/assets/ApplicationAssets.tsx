import { useRef, useState, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { ConfirmDialog } from '@/components/ConfirmDialog.tsx'
import { EmptyState } from '@/components/EmptyState.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { LoadingState } from '@/components/LoadingState.tsx'
import { Modal } from '@/components/Modal.tsx'
import { Select } from '@/components/Select.tsx'
import {
  assetSizeLabel,
  assetsInCategory,
  categoriesWithAssets,
  nextAssetOrder,
} from '@/features/assets/assetDisplay.ts'
import { IconGenerator } from '@/features/assets/IconGenerator.tsx'
import { SplashGenerator } from '@/features/assets/SplashGenerator.tsx'
import { useApplicationAssets } from '@/hooks/useApplicationAssets.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import {
  assetErrorCode,
  deleteApplicationAsset,
  downloadApplicationAsset,
  updateApplicationAsset,
  uploadApplicationAsset,
  type AssetErrorCode,
} from '@/services/assetService.ts'
import {
  assetCategories,
  assetContentTypes,
  isAssetCategory,
  type ApplicationAsset,
  type AssetCategory,
} from '@/types/asset.ts'
import styles from './ApplicationAssets.module.css'

export function ApplicationAssets({
  applicationId,
}: {
  applicationId: string
}): ReactElement {
  const { messages } = useLanguage()
  const { status, assets, errorCode, reload } =
    useApplicationAssets(applicationId)
  const [category, setCategory] = useState<AssetCategory>('appIcon')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<AssetErrorCode | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ApplicationAsset | null>(
    null,
  )
  const [preview, setPreview] = useState<ApplicationAsset | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const grouped = categoriesWithAssets(assets)

  async function handleUpload(): Promise<void> {
    if (!file) {
      return
    }

    setActionError(null)
    setIsUploading(true)

    try {
      await uploadApplicationAsset(
        applicationId,
        file,
        category,
        nextAssetOrder(assets, category),
      )
      setFile(null)
      if (fileRef.current) {
        fileRef.current.value = ''
      }
      reload()
    } catch (error: unknown) {
      setActionError(assetErrorCode(error, 'upload'))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleCategory(
    asset: ApplicationAsset,
    nextCategory: AssetCategory,
  ): Promise<void> {
    if (nextCategory === asset.category) {
      return
    }

    setActionError(null)
    setBusyId(asset.id)

    try {
      await updateApplicationAsset(applicationId, asset.id, {
        category: nextCategory,
        order: nextAssetOrder(assets, nextCategory),
      })
      reload()
    } catch (error: unknown) {
      setActionError(assetErrorCode(error, 'save'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleMove(
    asset: ApplicationAsset,
    direction: -1 | 1,
  ): Promise<void> {
    const items = assetsInCategory(assets, asset.category)
    const index = items.findIndex((item) => item.id === asset.id)
    const nextIndex = index + direction
    const neighbor = items[nextIndex]
    if (!neighbor) {
      return
    }

    const reordered = [...items]
    const [moved] = reordered.splice(index, 1)
    if (!moved) {
      return
    }
    reordered.splice(nextIndex, 0, moved)

    setActionError(null)
    setBusyId(asset.id)

    try {
      await Promise.all(
        reordered.map((item, position) =>
          updateApplicationAsset(applicationId, item.id, {
            category: item.category,
            order: position + 1,
          }),
        ),
      )
      reload()
    } catch (error: unknown) {
      setActionError(assetErrorCode(error, 'save'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDownload(asset: ApplicationAsset): Promise<void> {
    setActionError(null)
    setBusyId(asset.id)

    try {
      await downloadApplicationAsset(applicationId, asset)
    } catch (error: unknown) {
      setActionError(assetErrorCode(error, 'download'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!pendingDelete) {
      return
    }

    setActionError(null)
    setBusyId(pendingDelete.id)

    try {
      await deleteApplicationAsset(applicationId, pendingDelete.id)
      setPendingDelete(null)
      setPreview((current) =>
        current?.id === pendingDelete.id ? null : current,
      )
      reload()
    } catch (error: unknown) {
      setActionError(assetErrorCode(error, 'delete'))
    } finally {
      setBusyId(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className={styles.page}>
        <IconGenerator />
        <SplashGenerator />
        <LoadingState message={messages.assets.loading} />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={styles.page}>
        <IconGenerator />
        <SplashGenerator />
        <ErrorState
          message={messages.assets.errors[errorCode ?? 'load']}
          onRetry={reload}
        />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <IconGenerator />
      <SplashGenerator />
      <p className={styles.lead}>{messages.assets.lead}</p>
      <form
        className={styles.upload}
        onSubmit={(event) => {
          event.preventDefault()
          void handleUpload()
        }}
      >
        <Select
          className={styles.category}
          label={messages.assets.category}
          value={category}
          options={assetCategories.map((item) => ({
            value: item,
            label: messages.assets.categories[item],
          }))}
          onChange={(event) => {
            if (isAssetCategory(event.target.value)) {
              setCategory(event.target.value)
            }
          }}
        />
        <label className={styles.fileLabel}>
          {messages.assets.file}
          <input
            ref={fileRef}
            className={styles.file}
            type="file"
            accept={assetContentTypes.join(',')}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <span className={styles.hint}>{messages.assets.fileHint}</span>
        </label>
        <Button
          type="submit"
          disabled={!file || isUploading || busyId !== null}
        >
          {isUploading ? messages.assets.uploading : messages.assets.upload}
        </Button>
      </form>

      {actionError ? (
        <ErrorState message={messages.assets.errors[actionError]} />
      ) : null}

      {assets.length === 0 ? (
        <EmptyState
          title={messages.assets.emptyTitle}
          description={messages.assets.emptyDescription}
        />
      ) : null}

      {grouped.map((group) => (
        <section
          key={group}
          className={styles.group}
          aria-labelledby={`assets-${group}`}
        >
          <h3 id={`assets-${group}`} className={styles.groupTitle}>
            {messages.assets.categories[group]}
          </h3>
          <ul className={styles.grid}>
            {assetsInCategory(assets, group).map((asset, index, items) => (
              <li key={asset.id} className={styles.card}>
                <button
                  className={styles.previewButton}
                  type="button"
                  onClick={() => setPreview(asset)}
                >
                  <img
                    className={styles.preview}
                    src={asset.url}
                    alt={asset.name}
                  />
                </button>
                <div className={styles.meta}>
                  <p className={styles.name}>{asset.name}</p>
                  <p className={styles.size}>{assetSizeLabel(asset.size)}</p>
                </div>
                <Select
                  label={messages.assets.category}
                  value={asset.category}
                  disabled={busyId === asset.id}
                  options={assetCategories.map((item) => ({
                    value: item,
                    label: messages.assets.categories[item],
                  }))}
                  onChange={(event) => {
                    if (isAssetCategory(event.target.value)) {
                      void handleCategory(asset, event.target.value)
                    }
                  }}
                />
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    disabled={busyId === asset.id}
                    onClick={() => void handleDownload(asset)}
                  >
                    {messages.assets.download}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={index === 0 || busyId !== null}
                    onClick={() => void handleMove(asset, -1)}
                  >
                    {messages.assets.moveUp}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={index === items.length - 1 || busyId !== null}
                    onClick={() => void handleMove(asset, 1)}
                  >
                    {messages.assets.moveDown}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busyId === asset.id}
                    onClick={() => setPendingDelete(asset)}
                  >
                    {messages.assets.delete}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Modal
        open={preview !== null}
        title={preview?.name ?? messages.assets.preview}
        onClose={() => setPreview(null)}
      >
        {preview ? (
          <img className={styles.full} src={preview.url} alt={preview.name} />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={messages.assets.deleteTitle}
        description={
          pendingDelete
            ? messages.assets.deleteDescription(pendingDelete.name)
            : ''
        }
        confirmLabel={messages.assets.delete}
        cancelLabel={messages.common.cancel}
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
