import { describe, expect, it } from 'vitest'
import {
  runPreparationSteps,
  type PreparationStepId,
  type PreparationStepOutcome,
} from './releasePreparation.ts'

const release = {
  version: '1.4.2',
  buildNumber: 18,
  date: '2026-10-10',
  platform: 'android' as const,
  changes: 'Fix the timer',
}

describe('runPreparationSteps', () => {
  it('skips iOS for an Android release and validates only the Android build', async () => {
    const calls: Array<{ step: PreparationStepId; targets: string[] }> = []
    const result = await runPreparationSteps(
      release,
      (step, targets) => {
        calls.push({ step, targets })
        return Promise.resolve(success)
      },
      () => undefined,
    )

    expect(calls.map((call) => call.step)).toEqual([
      'dependencies',
      'analyze',
      'test',
      'version',
      'buildNumber',
      'changelog',
      'android',
      'output',
    ])
    expect(calls.at(-1)?.targets).toEqual(['android'])
    expect(result.errorCode).toBeNull()
    expect(result.steps.find((step) => step.id === 'ios')).toMatchObject({
      status: 'warning',
      reason: 'skipped',
    })
  })

  it('stops after a failed step and leaves the rest pending', async () => {
    const calls: PreparationStepId[] = []
    const result = await runPreparationSteps(
      { ...release, platform: 'both' },
      (step) => {
        calls.push(step)
        if (step === 'analyze') {
          return Promise.resolve({
            ok: true,
            status: 'failed',
            output: 'error',
            reason: null,
          })
        }
        return Promise.resolve(success)
      },
      () => undefined,
    )

    expect(calls).toEqual(['dependencies', 'analyze'])
    expect(result.steps.find((step) => step.id === 'test')?.status).toBe(
      'pending',
    )
    expect(result.steps.find((step) => step.id === 'android')?.status).toBe(
      'pending',
    )
  })

  it('continues after a warning and omits that platform from validation', async () => {
    const targets: string[][] = []
    const result = await runPreparationSteps(
      { ...release, platform: 'both' },
      (step, requested) => {
        if (step === 'output') {
          targets.push(requested)
        }
        if (step === 'ios') {
          return Promise.resolve({
            ok: true,
            status: 'warning',
            output: '',
            reason: 'unavailable',
          })
        }
        return Promise.resolve(success)
      },
      () => undefined,
    )

    expect(targets).toEqual([['android']])
    expect(result.steps.find((step) => step.id === 'ios')?.reason).toBe(
      'unavailable',
    )
    expect(result.errorCode).toBeNull()
  })
})

const success: PreparationStepOutcome = {
  ok: true,
  status: 'success',
  output: '',
  reason: null,
}
