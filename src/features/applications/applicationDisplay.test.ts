import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import type { Application } from '@/types/application.ts'
import { isReadyToBuild, repositoryLabel } from './applicationDisplay.ts'

const stamp = new Timestamp(1_700_000_000, 0)

function application(overrides: Partial<Application> = {}): Application {
  return {
    id: 'app',
    name: 'swiftlabel',
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  }
}

describe('application list display', () => {
  it('treats a saved local path as ready to build', () => {
    expect(
      isReadyToBuild(
        application({ repository: { localPath: 'C:\\apps\\swiftlabel' } }),
      ),
    ).toBe(true)
    expect(
      isReadyToBuild(application({ repository: { localPath: '   ' } })),
    ).toBe(false)
    expect(isReadyToBuild(application())).toBe(false)
  })

  it('shows the repository without the protocol', () => {
    expect(
      repositoryLabel(
        application({
          repository: { githubUrl: 'https://github.com/ivek1337/swiftlabel/' },
        }),
      ),
    ).toBe('github.com/ivek1337/swiftlabel')
    expect(repositoryLabel(application())).toBeUndefined()
  })
})
