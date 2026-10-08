import { useRef, useState, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import {
  downloadGeneratedIcon,
  downloadGeneratedIcons,
  generateIcons,
  readIconSource,
  type GeneratedIcon,
  type IconSource,
  type IconSourceProblem,
} from '@/features/assets/iconGenerator.ts'
import {
  iconGroups,
  iconSizes,
  isIconSourceType,
} from '@/features/assets/iconSizes.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { Messages } from '@/i18n/en.ts'
import styles from './IconGenerator.module.css'

export function IconGenerator(): ReactElement {
  const { messages } = useLanguage()
  const [source, setSource] = useState<IconSource | null>(null)
  const [icons, setIcons] = useState<GeneratedIcon[]>([])
  const [isReading, setIsReading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [failed, setFailed] = useState(false)
  const requestId = useRef(0)

  function replaceSource(next: IconSource | null): void {
    if (source?.previewUrl) {
      URL.revokeObjectURL(source.previewUrl)
    }
    for (const icon of icons) {
      URL.revokeObjectURL(icon.url)
    }
    setSource(next)
    setIcons([])
    setFailed(false)
  }

  async function handleFile(file: File | null): Promise<void> {
    if (!file) {
      replaceSource(null)
      return
    }

    setIsReading(true)
    setFailed(false)
    const request = requestId.current + 1
    requestId.current = request

    try {
      const next = await readIconSource(file)
      if (requestId.current !== request) {
        if (next.previewUrl) {
          URL.revokeObjectURL(next.previewUrl)
        }
        return
      }
      replaceSource(next)
    } catch {
      if (requestId.current === request) {
        replaceSource(null)
        setFailed(true)
      }
    } finally {
      if (requestId.current === request) {
        setIsReading(false)
      }
    }
  }

  async function handleGenerate(): Promise<void> {
    if (!source || source.problem) {
      return
    }

    setIsGenerating(true)
    setFailed(false)

    try {
      const next = await generateIcons(source)
      for (const icon of icons) {
        URL.revokeObjectURL(icon.url)
      }
      setIcons(next)
    } catch {
      setFailed(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const problem = source?.problem ?? null

  return (
    <section
      className={styles.generator}
      aria-labelledby="icon-generator-title"
    >
      <div className={styles.intro}>
        <h2 id="icon-generator-title" className={styles.title}>
          {messages.icons.title}
        </h2>
        <p className={styles.lead}>{messages.icons.lead}</p>
      </div>
      <label className={styles.fileLabel}>
        {messages.icons.source}
        <input
          className={styles.file}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null
            if (file && file.type && !isIconSourceType(file.type)) {
              replaceSource({
                image: new Image(),
                previewUrl: '',
                width: 0,
                height: 0,
                transparent: false,
                limited: false,
                problem: 'not-image',
              })
              return
            }
            void handleFile(file)
          }}
        />
        <span className={styles.hint}>{messages.icons.sourceHint}</span>
      </label>

      {isReading ? (
        <p className={styles.status}>{messages.icons.reading}</p>
      ) : null}
      {source && !source.problem ? (
        <div className={styles.source}>
          <img
            className={styles.sourcePreview}
            src={source.previewUrl}
            alt={messages.icons.source}
          />
          <p className={styles.status}>
            {messages.icons.dimensions(source.width, source.height)}
          </p>
        </div>
      ) : null}
      {problem ? (
        <ErrorState message={problemMessage(problem, source, messages)} />
      ) : null}
      {source && !source.problem && source.transparent ? (
        <p className={styles.warning} role="status">
          {messages.icons.transparent}
        </p>
      ) : null}
      {source?.limited ? (
        <p className={styles.status}>{messages.icons.reduced}</p>
      ) : null}
      {failed ? <ErrorState message={messages.icons.failed} /> : null}

      {source && !source.problem ? (
        <Button
          className={styles.generate}
          disabled={isReading || isGenerating}
          onClick={() => void handleGenerate()}
        >
          {isGenerating ? messages.icons.generating : messages.icons.generate}
        </Button>
      ) : null}

      {icons.length > 0 ? (
        <div className={styles.results}>
          <Button
            variant="secondary"
            onClick={() => downloadGeneratedIcons(icons)}
          >
            {messages.icons.downloadAll}
          </Button>
          {iconGroups.map((group) => (
            <section
              key={group}
              className={styles.group}
              aria-label={messages.icons.groups[group]}
            >
              <h3 className={styles.groupTitle}>
                {messages.icons.groups[group]}
              </h3>
              <ul className={styles.grid}>
                {iconSizes
                  .filter((size) => size.group === group)
                  .map((size) => {
                    const icon = icons.find((item) => item.id === size.id)
                    if (!icon) {
                      return null
                    }

                    return (
                      <li key={size.id} className={styles.card}>
                        <img
                          className={styles.preview}
                          src={icon.url}
                          alt={messages.icons.sizes[size.id]}
                        />
                        <p className={styles.name}>
                          {messages.icons.sizes[size.id]}
                        </p>
                        <p className={styles.pixels}>
                          {messages.icons.pixels(size.pixels)}
                        </p>
                        <Button
                          variant="secondary"
                          onClick={() => downloadGeneratedIcon(icon)}
                        >
                          {messages.icons.download}
                        </Button>
                      </li>
                    )
                  })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function problemMessage(
  problem: IconSourceProblem,
  source: IconSource | null,
  messages: Messages,
): string {
  if (problem === 'not-square') {
    return messages.icons.errors.notSquare(
      source?.width ?? 0,
      source?.height ?? 0,
    )
  }

  if (problem === 'too-small') {
    return messages.icons.errors.tooSmall(
      source?.width ?? 0,
      source?.height ?? 0,
    )
  }

  return messages.icons.errors.notImage
}
