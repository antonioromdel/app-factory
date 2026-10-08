import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import ReactMarkdown from 'react-markdown'
import { useLanguage } from '@/hooks/useLanguage.ts'
import type { Messages } from '@/i18n/en.ts'
import styles from './KnowledgeArticleBody.module.css'

const commandLanguages = new Set([
  'command',
  'bash',
  'sh',
  'shell',
  'zsh',
  'console',
  'terminal',
  'powershell',
  'ps1',
  'cmd',
])

export function KnowledgeArticleBody({
  content,
}: {
  content: string
}): ReactElement {
  return (
    <div className={styles.content}>
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            const safeHref = articleHref(href)
            if (!safeHref) {
              return <span>{children}</span>
            }

            return (
              <a href={safeHref} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          },
          pre: ({ children }) => (
            <ArticleCodeBlock>{children}</ArticleCodeBlock>
          ),
          blockquote: ({ children }) => (
            <ArticleCallout>{children}</ArticleCallout>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function ArticleCodeBlock({
  children,
}: {
  children?: ReactNode
}): ReactElement {
  const { messages } = useLanguage()
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  )
  const resetTimer = useRef<number | null>(null)
  const fenced = fencedCode(children)
  const label = blockLabel(fenced.language, messages)

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current)
      }
    }
  }, [])

  async function copy(): Promise<void> {
    const copied = await copyText(fenced.text)
    setCopyState(copied ? 'copied' : 'failed')
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current)
    }
    resetTimer.current = window.setTimeout(() => {
      setCopyState('idle')
    }, 2000)
  }

  return (
    <div className={styles.block}>
      <div className={styles.blockHeader}>
        <span className={styles.blockLabel}>{label}</span>
        <button
          className={styles.copy}
          type="button"
          aria-live="polite"
          aria-label={
            copyState === 'idle'
              ? messages.knowledge.copyNamed(label)
              : copyButtonText(copyState, messages)
          }
          onClick={() => {
            void copy()
          }}
        >
          {copyButtonText(copyState, messages)}
        </button>
      </div>
      <pre>
        <code>{fenced.text}</code>
      </pre>
    </div>
  )
}

function ArticleCallout({ children }: { children?: ReactNode }): ReactElement {
  const { messages } = useLanguage()
  const kind = calloutKind(children)

  if (!kind) {
    return <blockquote>{children}</blockquote>
  }

  return (
    <aside
      className={kind === 'warning' ? styles.warning : styles.note}
      role="note"
    >
      <p className={styles.calloutLabel}>
        {kind === 'warning'
          ? messages.knowledge.warning
          : messages.knowledge.note}
      </p>
      <div>{stripCalloutMarker(children)}</div>
    </aside>
  )
}

function copyButtonText(
  state: 'idle' | 'copied' | 'failed',
  messages: Messages,
): string {
  if (state === 'copied') {
    return messages.knowledge.copied
  }

  if (state === 'failed') {
    return messages.knowledge.copyFailed
  }

  return messages.knowledge.copy
}

function blockLabel(language: string | null, messages: Messages): string {
  if (!language) {
    return messages.knowledge.snippet
  }

  const normalized = language.toLocaleLowerCase()
  if (commandLanguages.has(normalized)) {
    return messages.knowledge.command
  }

  if (normalized === 'config' || normalized === 'configuration') {
    return messages.knowledge.configuration
  }

  return messages.knowledge.snippetLanguage(language)
}

function fencedCode(children: ReactNode): {
  text: string
  language: string | null
} {
  for (const child of toChildArray(children)) {
    if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) {
      continue
    }

    const match = /language-([\w+-]+)/.exec(child.props.className ?? '')
    return {
      text: reactNodeToText(child.props.children).replace(/\n$/, ''),
      language: match?.[1] ?? null,
    }
  }

  return {
    text: reactNodeToText(children).replace(/\n$/, ''),
    language: null,
  }
}

function calloutKind(children: ReactNode): 'note' | 'warning' | null {
  const text = reactNodeToText(children).trimStart()
  if (/^\[!NOTE\]/i.test(text)) {
    return 'note'
  }

  if (/^\[!WARNING\]/i.test(text)) {
    return 'warning'
  }

  return null
}

function stripCalloutMarker(children: ReactNode): ReactNode {
  const marker = /^\[!(?:NOTE|WARNING)\]\s*/i
  let stripped = false

  function walk(node: ReactNode): ReactNode {
    if (stripped) {
      return node
    }

    if (typeof node === 'string') {
      if (!marker.test(node)) {
        return node
      }

      stripped = true
      return node.replace(marker, '')
    }

    if (Array.isArray(node)) {
      return node.map((item) => walk(item))
    }

    if (isValidElement<{ children?: ReactNode }>(node)) {
      return cloneElement(node, {}, walk(node.props.children))
    }

    return node
  }

  return walk(children)
}

function reactNodeToText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map((item) => reactNodeToText(item)).join('')
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return reactNodeToText(node.props.children)
  }

  return ''
}

function toChildArray(children: ReactNode): ReactNode[] {
  return Array.isArray(children) ? children : [children]
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error: unknown) {
    console.error(error)
    return false
  }
}

function articleHref(href: string | undefined): string | null {
  if (!href || /\s/.test(href)) {
    return null
  }

  try {
    const url = new URL(href)
    if (
      url.protocol !== 'http:' &&
      url.protocol !== 'https:' &&
      url.protocol !== 'mailto:'
    ) {
      return null
    }

    return url.href
  } catch {
    return null
  }
}
