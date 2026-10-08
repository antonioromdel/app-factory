import { useId, useRef, useState, type ReactElement } from 'react'
import { Button } from '@/components/Button.tsx'
import { ErrorState } from '@/components/ErrorState.tsx'
import { Select } from '@/components/Select.tsx'
import {
  isSplashAlignment,
  splashAlignments,
  splashBackgrounds,
  type SplashAlignment,
  type SplashBackgroundId,
} from '@/features/assets/splashConfig.ts'
import {
  downloadSplashFile,
  downloadSplashFiles,
  generateSplash,
  isHexColor,
  readSplashLogo,
  type SplashFile,
  type SplashLogo,
  type SplashLogoProblem,
} from '@/features/assets/splashGenerator.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { Messages } from '@/i18n/en.ts'
import { joinClasses } from '@/utils/joinClasses.ts'
import styles from './SplashGenerator.module.css'

const backgroundIds = Object.keys(splashBackgrounds) as SplashBackgroundId[]

export function SplashGenerator(): ReactElement {
  const { messages } = useLanguage()
  const colorId = useId()
  const [logo, setLogo] = useState<SplashLogo | null>(null)
  const [color, setColor] = useState<string>(splashBackgrounds.white)
  const [alignment, setAlignment] = useState<SplashAlignment>('center')
  const [output, setOutput] = useState<SplashFile[]>([])
  const [configuration, setConfiguration] = useState('')
  const [isReading, setIsReading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState(false)
  const requestId = useRef(0)

  function replaceLogo(next: SplashLogo | null): void {
    if (logo?.previewUrl) {
      URL.revokeObjectURL(logo.previewUrl)
    }
    for (const file of output) {
      URL.revokeObjectURL(file.url)
    }
    setLogo(next)
    setOutput([])
    setConfiguration('')
    setFailed(false)
    setCopied(false)
  }

  async function handleFile(file: File | null): Promise<void> {
    if (!file) {
      replaceLogo(null)
      return
    }

    setIsReading(true)
    setFailed(false)
    const request = requestId.current + 1
    requestId.current = request

    try {
      const next = await readSplashLogo(file)
      if (requestId.current !== request) {
        if (next.previewUrl) {
          URL.revokeObjectURL(next.previewUrl)
        }
        return
      }
      replaceLogo(next)
    } catch {
      if (requestId.current === request) {
        replaceLogo(null)
        setFailed(true)
      }
    } finally {
      if (requestId.current === request) {
        setIsReading(false)
      }
    }
  }

  async function handleGenerate(): Promise<void> {
    if (!logo || logo.problem || !isHexColor(color)) {
      return
    }

    setIsGenerating(true)
    setFailed(false)
    const request = requestId.current

    try {
      const next = await generateSplash(logo, color, alignment)
      if (requestId.current !== request) {
        for (const file of next.files) {
          URL.revokeObjectURL(file.url)
        }
        return
      }
      for (const file of output) {
        URL.revokeObjectURL(file.url)
      }
      setOutput(next.files)
      setConfiguration(next.configuration)
      setCopied(false)
    } catch {
      if (requestId.current === request) {
        setFailed(true)
      }
    } finally {
      if (requestId.current === request) {
        setIsGenerating(false)
      }
    }
  }

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(configuration)
      setCopied(true)
    } catch {
      setCopied(false)
      setFailed(true)
    }
  }

  const ready = logo !== null && logo.problem === null
  const images = output.filter((file) => file.id !== 'config')

  return (
    <section className={styles.generator}>
      <div className={styles.intro}>
        <h2 className={styles.title}>{messages.splash.title}</h2>
        <p className={styles.lead}>{messages.splash.lead}</p>
      </div>

      <label className={styles.fileLabel}>
        {messages.splash.logo}
        <input
          className={styles.file}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={isReading || isGenerating}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null
            event.target.value = ''
            void handleFile(file)
          }}
        />
      </label>
      <p className={styles.hint}>{messages.splash.logoHint}</p>

      {isReading ? (
        <p className={styles.status}>{messages.splash.reading}</p>
      ) : null}

      {logo?.problem ? (
        <ErrorState message={problemMessage(messages, logo.problem, logo)} />
      ) : null}

      {logo && !logo.problem && logo.small ? (
        <p className={styles.warning} role="status">
          {messages.splash.small}
        </p>
      ) : null}

      {logo?.limited ? (
        <p className={styles.warning} role="status">
          {messages.splash.reduced}
        </p>
      ) : null}

      {ready && logo ? (
        <div className={styles.controls}>
          <div className={styles.background}>
            <label className={styles.fileLabel} htmlFor={colorId}>
              {messages.splash.background}
            </label>
            <div className={styles.colorRow}>
              <input
                id={colorId}
                className={styles.color}
                type="color"
                value={color}
                onChange={(event) => {
                  const next = event.target.value.toLowerCase()
                  if (isHexColor(next)) {
                    setColor(next)
                  }
                }}
              />
              <span className={styles.hex}>{color}</span>
              {backgroundIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={styles.preset}
                  style={{ backgroundColor: splashBackgrounds[id] }}
                  aria-label={messages.splash.presets[id]}
                  aria-pressed={color === splashBackgrounds[id]}
                  onClick={() => setColor(splashBackgrounds[id])}
                />
              ))}
            </div>
          </div>

          <Select
            label={messages.splash.alignment}
            value={alignment}
            options={splashAlignments.map((value) => ({
              value,
              label: messages.splash.alignments[value],
            }))}
            onChange={(event) => {
              if (isSplashAlignment(event.target.value)) {
                setAlignment(event.target.value)
              }
            }}
          />

          <div className={styles.preview}>
            <p className={styles.hint}>{messages.splash.preview}</p>
            <div
              className={joinClasses(styles.phone, styles[alignment])}
              style={{ backgroundColor: color }}
            >
              <img className={styles.logo} src={logo.previewUrl} alt="" />
            </div>
            <p className={styles.hint}>{messages.splash.android12Note}</p>
          </div>

          <Button disabled={isGenerating} onClick={() => void handleGenerate()}>
            {isGenerating
              ? messages.splash.generating
              : messages.splash.generate}
          </Button>
        </div>
      ) : null}

      {failed ? <ErrorState message={messages.splash.failed} /> : null}

      {images.length > 0 ? (
        <div className={styles.results}>
          <Button
            variant="secondary"
            onClick={() => downloadSplashFiles(output)}
          >
            {messages.splash.downloadAll}
          </Button>
          <ul className={styles.list}>
            {images.map((file) => (
              <li key={file.id} className={styles.item}>
                <img className={styles.thumb} src={file.url} alt="" />
                <div>
                  <p className={styles.fileName}>
                    {messages.splash.files[file.id]}
                  </p>
                  <p className={styles.pixels}>{file.fileName}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => downloadSplashFile(file)}
                >
                  {messages.splash.download}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {configuration ? (
        <div className={styles.config}>
          <div className={styles.configActions}>
            <h3 className={styles.configTitle}>
              {messages.splash.files.config}
            </h3>
            <Button variant="secondary" onClick={() => void handleCopy()}>
              {copied ? messages.splash.copied : messages.splash.copy}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const file = output.find((item) => item.id === 'config')
                if (file) {
                  downloadSplashFile(file)
                }
              }}
            >
              {messages.splash.download}
            </Button>
          </div>
          <pre className={styles.yaml}>{configuration}</pre>
        </div>
      ) : null}
    </section>
  )
}

function problemMessage(
  messages: Messages,
  problem: SplashLogoProblem,
  logo: SplashLogo,
): string {
  if (problem === 'too-small') {
    return messages.splash.errors.tooSmall(logo.width, logo.height)
  }
  return messages.splash.errors.notImage
}
