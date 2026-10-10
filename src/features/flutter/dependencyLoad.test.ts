import { describe, expect, it } from 'vitest'
import { dependencyLoadMatches } from '@/features/flutter/dependencyLoad.ts'

describe('dependency load', () => {
  it('keeps a finished read for the same folder', () => {
    expect(
      dependencyLoadMatches(
        { directory: 'C:\\apps\\interval', requestId: 0 },
        'C:\\apps\\interval',
        0,
      ),
    ).toBe(true)
  })

  it('reads again when the folder changes or the list is refreshed', () => {
    const load = { directory: 'C:\\apps\\interval', requestId: 0 }

    expect(dependencyLoadMatches(load, 'C:\\apps\\other', 0)).toBe(false)
    expect(dependencyLoadMatches(load, 'C:\\apps\\interval', 1)).toBe(false)
    expect(dependencyLoadMatches(null, 'C:\\apps\\interval', 0)).toBe(false)
    expect(dependencyLoadMatches(load, undefined, 0)).toBe(false)
  })
})
