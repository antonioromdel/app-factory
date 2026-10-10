import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import {
  formFromApplication,
  toApplicationInput,
} from '@/features/applications/applicationFormState.ts'
import type { Application } from '@/types/application.ts'

const stamp = new Timestamp(1_700_000_000, 0)

describe('application form notes', () => {
  it('keeps every project note when editing an application', () => {
    const application: Application = {
      id: 'app',
      name: 'Interval',
      createdAt: stamp,
      updatedAt: stamp,
      notes: {
        technicalNotes: 'Riverpod',
        knownIssues: 'Cold start',
        ideas: 'Home screen widgets',
        architectureDecisions: 'Features own their state',
        importantCommands: 'flutter test',
        lessonsLearned: 'Pin the Flutter version',
      },
    }

    expect(toApplicationInput(formFromApplication(application)).notes).toEqual(
      application.notes,
    )
  })
})
