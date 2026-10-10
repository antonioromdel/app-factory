import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { buildSearchResults } from '@/features/search/searchResults.ts'
import { en } from '@/i18n/en.ts'
import type { Application } from '@/types/application.ts'

const stamp = new Timestamp(1_700_000_000, 0)

function application(notes: Application['notes']): Application {
  return {
    id: 'app',
    name: 'Interval',
    createdAt: stamp,
    updatedAt: stamp,
    notes,
  }
}

describe('note search', () => {
  it('finds architecture decisions, commands and lessons learned', () => {
    const groups = buildSearchResults(
      'keystore',
      [
        application({
          architectureDecisions: 'Keep signing outside the repo',
          importantCommands: 'flutter build appbundle',
          lessonsLearned: 'Rotate the keystore yearly',
        }),
      ],
      [],
      en,
    )

    expect(groups).toEqual([
      {
        id: 'notes',
        total: 1,
        hits: [
          {
            id: 'app-lessonsLearned',
            title: 'Lessons learned',
            detail: 'In Interval · Rotate the keystore yearly',
            to: '/applications/app?tab=notes',
          },
        ],
      },
    ])
  })

  it('matches a command note by its section name', () => {
    const groups = buildSearchResults(
      'commands',
      [application({ importantCommands: 'flutter build appbundle' })],
      [],
      en,
    )

    expect(groups[0]?.hits[0]).toMatchObject({
      id: 'app-importantCommands',
      title: 'Important commands',
      to: '/applications/app?tab=notes',
    })
  })
})
