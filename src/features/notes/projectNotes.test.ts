import { describe, expect, it } from 'vitest'
import {
  draftFromNotes,
  matchingNoteKinds,
  notesFromDraft,
  projectNoteKinds,
  type ProjectNoteKind,
} from '@/features/notes/projectNotes.ts'

const labels: Record<ProjectNoteKind, string> = {
  technicalNotes: 'Technical notes',
  knownIssues: 'Known issues',
  ideas: 'Future ideas',
  architectureDecisions: 'Architecture decisions',
  importantCommands: 'Important commands',
  lessonsLearned: 'Lessons learned',
}

describe('project notes', () => {
  it('keeps every filled section and drops blank text', () => {
    const notes = notesFromDraft({
      ...draftFromNotes(undefined),
      technicalNotes: '  Riverpod  ',
      knownIssues: '   ',
      ideas: 'Offline mode',
      architectureDecisions: 'Features own their state',
      importantCommands: 'flutter test',
      lessonsLearned: 'Pin the Flutter version',
    })

    expect(notes).toEqual({
      technicalNotes: 'Riverpod',
      ideas: 'Offline mode',
      architectureDecisions: 'Features own their state',
      importantCommands: 'flutter test',
      lessonsLearned: 'Pin the Flutter version',
    })
    expect(Object.keys(notes ?? {}).sort()).toEqual(
      [
        'technicalNotes',
        'ideas',
        'architectureDecisions',
        'importantCommands',
        'lessonsLearned',
      ].sort(),
    )
  })

  it('returns nothing when every section is empty', () => {
    expect(notesFromDraft(draftFromNotes(undefined))).toBeUndefined()
  })

  it('shows every section until there is a search', () => {
    expect(matchingNoteKinds(draftFromNotes(undefined), '   ', labels)).toEqual(
      [...projectNoteKinds],
    )
  })

  it('matches a section by its title or its text without dropping the others from the draft', () => {
    const draft = {
      ...draftFromNotes({
        importantCommands: 'flutter build appbundle',
        lessonsLearned: 'Rotate the keystore yearly',
      }),
    }

    expect(matchingNoteKinds(draft, 'COMMANDS', labels)).toEqual([
      'importantCommands',
    ])
    expect(matchingNoteKinds(draft, 'keystore', labels)).toEqual([
      'lessonsLearned',
    ])
    expect(notesFromDraft(draft)?.importantCommands).toBe(
      'flutter build appbundle',
    )
    expect(notesFromDraft(draft)?.lessonsLearned).toBe(
      'Rotate the keystore yearly',
    )
  })
})
