import { describe, expect, it } from 'vitest'
import {
  productsForPlatform,
  runProjectBuildSteps,
  type BuildStepId,
} from './projectBuild.ts'

describe('runProjectBuildSteps', () => {
  it('stops before compiling when signing fails', async () => {
    const calls: BuildStepId[] = []
    const result = await runProjectBuildSteps(
      'android',
      (step) => {
        calls.push(step)
        if (step === 'signing') {
          return Promise.resolve({
            ok: true,
            status: 'failed',
            output: '',
            reason: 'missing-signing',
          })
        }
        return Promise.resolve({
          ok: true,
          status: 'success',
          output: '',
          reason: null,
        })
      },
      () => undefined,
    )

    expect(calls).toEqual(['flutter', 'signing'])
    expect(result.steps.find((step) => step.id === 'build')?.status).toBe(
      'pending',
    )
  })

  it('includes certificates and provisioning for iOS and skips validation when the build did not run', async () => {
    const builtFlags: boolean[] = []
    await runProjectBuildSteps(
      'ios',
      (step, built) => {
        if (step === 'output') {
          builtFlags.push(built)
        }
        if (step === 'build') {
          return Promise.resolve({
            ok: true,
            status: 'warning',
            output: '',
            reason: 'unavailable',
          })
        }
        return Promise.resolve({
          ok: true,
          status: 'success',
          output: '',
          reason: null,
        })
      },
      () => undefined,
    )

    expect(builtFlags).toEqual([false])
  })

  it('offers the Android and iOS artifacts', () => {
    expect(productsForPlatform('android')).toEqual([
      'debug-apk',
      'release-apk',
      'aab',
    ])
    expect(productsForPlatform('ios')).toEqual(['debug', 'release', 'ipa'])
  })
})
