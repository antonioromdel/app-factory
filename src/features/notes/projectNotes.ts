import type { ApplicationNotes } from '@/types/application.ts'

export const projectNoteKinds = [
  'technicalNotes',
  'knownIssues',
  'ideas',
  'architectureDecisions',
  'importantCommands',
  'lessonsLearned',
] as const

export type ProjectNoteKind = (typeof projectNoteKinds)[number]

export type ProjectNoteDraft = Record<ProjectNoteKind, string>

export function emptyProjectNoteDraft(): ProjectNoteDraft {
  return {
    technicalNotes: '',
    knownIssues: '',
    ideas: '',
    architectureDecisions: '',
    importantCommands: '',
    lessonsLearned: '',
  }
}

export function draftFromNotes(
  notes: ApplicationNotes | undefined,
): ProjectNoteDraft {
  const draft = emptyProjectNoteDraft()
  for (const kind of projectNoteKinds) {
    draft[kind] = notes?.[kind] ?? ''
  }
  return draft
}

export function notesFromDraft(
  draft: ProjectNoteDraft,
): ApplicationNotes | undefined {
  const notes: ApplicationNotes = {}
  for (const kind of projectNoteKinds) {
    const trimmed = draft[kind].trim()
    if (trimmed) {
      notes[kind] = trimmed
    }
  }

  return projectNoteKinds.some((kind) => notes[kind]) ? notes : undefined
}

export function noteSignature(notes: ApplicationNotes | undefined): string {
  return projectNoteKinds.map((kind) => notes?.[kind] ?? '').join('\u0000')
}

export function noteDraftsDiffer(
  draft: ProjectNoteDraft,
  baseline: ProjectNoteDraft,
): boolean {
  return projectNoteKinds.some((kind) => draft[kind] !== baseline[kind])
}

export function matchingNoteKinds(
  draft: ProjectNoteDraft,
  query: string,
  labels: Record<ProjectNoteKind, string>,
): ProjectNoteKind[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) {
    return [...projectNoteKinds]
  }

  return projectNoteKinds.filter((kind) =>
    `${labels[kind]}\n${draft[kind]}`.toLocaleLowerCase().includes(needle),
  )
}
