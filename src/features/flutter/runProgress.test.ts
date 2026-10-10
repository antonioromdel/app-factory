import { describe, expect, it } from 'vitest'
import { stepRunProgress } from '@/features/flutter/runProgress.ts'

describe('step run progress', () => {
  it('starts at the first step with nothing finished', () => {
    expect(
      stepRunProgress([
        { status: 'running' },
        { status: 'pending' },
        { status: 'pending' },
      ]),
    ).toEqual({ total: 3, completed: 0, current: 1 })
  })

  it('counts finished steps and points at the one still running', () => {
    expect(
      stepRunProgress([
        { status: 'passed' },
        { status: 'success' },
        { status: 'warning' },
        { status: 'running' },
        { status: 'pending' },
      ]),
    ).toEqual({ total: 5, completed: 3, current: 4 })
  })

  it('treats a failed step as finished and stops naming a current one', () => {
    expect(
      stepRunProgress([
        { status: 'success' },
        { status: 'failed' },
        { status: 'pending' },
      ]),
    ).toEqual({ total: 3, completed: 2, current: null })
  })
})
