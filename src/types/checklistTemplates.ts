import {
  checklistCategories,
  checklistItems,
  type ChecklistCategory,
  type ChecklistItemId,
} from '@/types/checklist.ts'

export const checklistTemplateIds = [
  'basic',
  'firebase',
  'admob',
  'commercial',
  'androidRelease',
  'iosRelease',
] as const

export type ChecklistTemplateId = (typeof checklistTemplateIds)[number]

const templateCategories = {
  basic: ['projectCreation', 'flutter', 'development', 'testing', 'release'],
  firebase: [
    'projectCreation',
    'flutter',
    'development',
    'testing',
    'firebase',
    'release',
  ],
  admob: [
    'projectCreation',
    'flutter',
    'development',
    'testing',
    'firebase',
    'admob',
    'release',
  ],
  commercial: checklistCategories,
  androidRelease: ['android', 'googlePlay', 'release'],
  iosRelease: ['ios', 'appStore', 'release'],
} as const satisfies Record<ChecklistTemplateId, readonly ChecklistCategory[]>

const templateIdSet = new Set<string>(checklistTemplateIds)

export function isChecklistTemplateId(
  value: string,
): value is ChecklistTemplateId {
  return templateIdSet.has(value)
}

export function templateCategoriesFor(
  templateId: ChecklistTemplateId,
): readonly ChecklistCategory[] {
  return templateCategories[templateId]
}

export function templateItemIds(
  templateId: ChecklistTemplateId,
): ChecklistItemId[] {
  const categories = new Set<string>(templateCategories[templateId])
  return checklistItems
    .filter((item) => categories.has(item.category))
    .map((item) => item.id)
}
