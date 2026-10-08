import {
  checklistItems,
  itemsInCategory,
  orderedCompletedIds,
  type ChecklistCategory,
  type ChecklistItemId,
} from '@/types/checklist.ts'

export function toggleChecklistItem(
  completed: readonly ChecklistItemId[],
  itemId: ChecklistItemId,
): ChecklistItemId[] {
  const selected = new Set(completed)
  if (selected.has(itemId)) {
    selected.delete(itemId)
  } else {
    selected.add(itemId)
  }

  return orderedCompletedIds(selected)
}

export function resolveChecklistItems(
  itemIds: readonly ChecklistItemId[] | null,
): ChecklistItemId[] {
  return itemIds ? [...itemIds] : checklistItems.map((item) => item.id)
}

export function checklistCounts(
  completed: readonly ChecklistItemId[],
  itemIds: readonly ChecklistItemId[],
): {
  completed: number
  total: number
  percent: number
} {
  const included = new Set(itemIds)
  const total = itemIds.length
  const done = completed.filter((id) => included.has(id)).length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return { completed: done, total, percent }
}

export function categoryCounts(
  category: ChecklistCategory,
  completed: readonly ChecklistItemId[],
  itemIds: readonly ChecklistItemId[],
): { completed: number; total: number } {
  const included = new Set(itemIds)
  const items = itemsInCategory(category).filter((item) =>
    included.has(item.id),
  )
  const selected = new Set(completed)

  return {
    completed: items.filter((item) => selected.has(item.id)).length,
    total: items.length,
  }
}
