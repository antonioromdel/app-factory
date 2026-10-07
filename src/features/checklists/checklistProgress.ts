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

export function checklistCounts(completed: readonly ChecklistItemId[]): {
  completed: number
  total: number
  percent: number
} {
  const total = checklistItems.length
  const done = completed.length
  const percent = Math.round((done / total) * 100)

  return { completed: done, total, percent }
}

export function categoryCounts(
  category: ChecklistCategory,
  completed: readonly ChecklistItemId[],
): { completed: number; total: number } {
  const items = itemsInCategory(category)
  const selected = new Set(completed)

  return {
    completed: items.filter((item) => selected.has(item.id)).length,
    total: items.length,
  }
}
