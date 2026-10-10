import { projectNoteKinds } from '@/features/notes/projectNotes.ts'
import type { Messages } from '@/i18n/en.ts'
import { checklistItems } from '@/types/checklist.ts'
import { checklistTemplateIds } from '@/types/checklistTemplates.ts'
import type { Application } from '@/types/application.ts'

const resultLimit = 8

export const searchGroupIds = [
  'applications',
  'knowledge',
  'checklists',
  'urls',
  'notes',
] as const

export type SearchGroupId = (typeof searchGroupIds)[number]

export interface SearchArticle {
  id: string
  title: string
  categoryLabel: string
  tags: string[]
  content: string
  included: boolean
}

export interface SearchHit {
  id: string
  title: string
  detail: string
  to: string
}

export interface SearchGroup {
  id: SearchGroupId
  hits: SearchHit[]
  total: number
}

export function buildSearchResults(
  query: string,
  applications: Application[],
  articles: SearchArticle[],
  messages: Messages,
): SearchGroup[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) {
    return []
  }

  const ordered = [...applications].sort((left, right) =>
    left.name.localeCompare(right.name),
  )
  const groups = [
    limit(applicationHits(ordered, needle, messages)),
    limit(articleHits(articles, needle, messages)),
    limit(checklistHits(needle, messages)),
    limit(urlHits(ordered, needle, messages)),
    limit(noteHits(ordered, needle, messages)),
  ]

  return searchGroupIds.flatMap((id, index) => {
    const group = groups[index]
    return group && group.total > 0 ? [{ id, ...group }] : []
  })
}

function applicationHits(
  applications: Application[],
  needle: string,
  messages: Messages,
): SearchHit[] {
  return applications
    .filter((application) =>
      contains(needle, [
        application.name,
        application.description,
        application.category,
        application.tags?.join(' '),
        application.status ? messages.status[application.status] : undefined,
        application.flutter?.packageName,
        application.flutter?.bundleId,
        application.flutter?.flutterVersion,
        application.flutter?.dartVersion,
        application.flutter?.architecture,
        application.flutter?.stateManagement,
        application.repository?.repositoryName,
        application.repository?.localPath,
        application.firebase?.projectId,
        application.googlePlay?.currentVersion,
        application.appStore?.currentVersion,
      ]),
    )
    .map((application) => ({
      id: application.id,
      title: application.name,
      detail: [
        application.status ? messages.status[application.status] : undefined,
        application.category,
        application.flutter?.packageName,
      ]
        .filter((value): value is string => Boolean(value))
        .join(' · '),
      to: `/applications/${application.id}`,
    }))
}

function articleHits(
  articles: SearchArticle[],
  needle: string,
  messages: Messages,
): SearchHit[] {
  return [...articles]
    .sort((left, right) => {
      if (left.included !== right.included) {
        return left.included ? -1 : 1
      }

      return left.title.localeCompare(right.title)
    })
    .filter((article) =>
      contains(needle, [
        article.title,
        article.content,
        article.tags.join(' '),
        article.categoryLabel,
      ]),
    )
    .map((article) => ({
      id: article.id,
      title: article.title,
      detail: article.included
        ? `${messages.knowledge.library} · ${article.categoryLabel}`
        : article.categoryLabel,
      to: `/knowledge/${article.id}`,
    }))
}

function checklistHits(needle: string, messages: Messages): SearchHit[] {
  const templates = checklistTemplateIds.flatMap((templateId) => {
    const title = messages.checklist.templates[templateId]
    const description = messages.checklist.templateDescriptions[templateId]
    if (!contains(needle, [title, description])) {
      return []
    }

    return [
      {
        id: `template-${templateId}`,
        title,
        detail: description,
        to: `/checklists#template-${templateId}`,
      },
    ]
  })
  const items = checklistItems.flatMap((item) => {
    const title = messages.checklist.items[item.id]
    const category = messages.checklist.categories[item.category]
    if (!contains(needle, [title, category])) {
      return []
    }

    return [
      {
        id: item.id,
        title,
        detail: category,
        to: `/checklists#commercial-${item.id}`,
      },
    ]
  })

  return [...templates, ...items]
}

function urlHits(
  applications: Application[],
  needle: string,
  messages: Messages,
): SearchHit[] {
  return applications.flatMap((application) =>
    urlFields(application, messages).flatMap((field) => {
      if (!field.value || !contains(needle, [field.label, field.value])) {
        return []
      }

      return [
        {
          id: `${application.id}-${field.id}`,
          title: field.label,
          detail: `${messages.search.inApplication(application.name)} · ${field.value}`,
          to: `/applications/${application.id}?tab=${field.tab}`,
        },
      ]
    }),
  )
}

function noteHits(
  applications: Application[],
  needle: string,
  messages: Messages,
): SearchHit[] {
  return applications.flatMap((application) =>
    noteFields(application, messages).flatMap((field) => {
      if (!field.value || !contains(needle, [field.label, field.value])) {
        return []
      }

      return [
        {
          id: `${application.id}-${field.id}`,
          title: field.label,
          detail: `${messages.search.inApplication(application.name)} · ${snippet(field.value, needle)}`,
          to: `/applications/${application.id}?tab=notes`,
        },
      ]
    }),
  )
}

function urlFields(
  application: Application,
  messages: Messages,
): Array<{ id: string; label: string; value?: string; tab: string }> {
  return [
    {
      id: 'github',
      label: messages.fields.githubUrl,
      value: application.repository?.githubUrl,
      tab: 'development',
    },
    {
      id: 'firebase-console',
      label: messages.fields.consoleUrl,
      value: application.firebase?.consoleUrl,
      tab: 'firebase',
    },
    {
      id: 'admob',
      label: messages.fields.admobConsoleUrl,
      value: application.admob?.consoleUrl,
      tab: 'monetization',
    },
    {
      id: 'revenuecat',
      label: messages.fields.revenueCatUrl,
      value: application.revenueCat?.dashboardUrl,
      tab: 'monetization',
    },
    {
      id: 'play-console',
      label: messages.fields.playConsoleUrl,
      value: application.googlePlay?.consoleUrl,
      tab: 'stores',
    },
    {
      id: 'play-store',
      label: messages.fields.playStoreUrl,
      value: application.googlePlay?.storeUrl,
      tab: 'stores',
    },
    {
      id: 'app-store-connect',
      label: messages.fields.appStoreConnectUrl,
      value: application.appStore?.appStoreConnectUrl,
      tab: 'stores',
    },
    {
      id: 'app-store',
      label: messages.fields.appStoreUrl,
      value: application.appStore?.storeUrl,
      tab: 'stores',
    },
    {
      id: 'testflight',
      label: messages.fields.testFlightUrl,
      value: application.appStore?.testFlightUrl,
      tab: 'stores',
    },
  ]
}

function noteFields(
  application: Application,
  messages: Messages,
): Array<{ id: string; label: string; value?: string }> {
  return projectNoteKinds.map((kind) => ({
    id: kind,
    label: messages.fields[kind],
    value: application.notes?.[kind],
  }))
}

function contains(needle: string, values: Array<string | undefined>): boolean {
  return values.some((value) => value?.toLocaleLowerCase().includes(needle))
}

function snippet(value: string, needle: string): string {
  const compact = value.replace(/\s+/g, ' ').trim()
  const index = compact.toLocaleLowerCase().indexOf(needle)
  const start = Math.max(0, index < 0 ? 0 : index - 24)
  const end = Math.min(
    compact.length,
    (index < 0 ? 0 : index) + needle.length + 48,
  )
  const slice = compact.slice(start, end)

  return `${start > 0 ? '…' : ''}${slice}${end < compact.length ? '…' : ''}`
}

function limit(hits: SearchHit[]): { hits: SearchHit[]; total: number } {
  return { hits: hits.slice(0, resultLimit), total: hits.length }
}
