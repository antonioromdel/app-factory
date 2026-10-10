export const buildPlatforms = ['android', 'ios'] as const

export type BuildPlatform = (typeof buildPlatforms)[number]

export const androidBuildProducts = ['debug-apk', 'release-apk', 'aab'] as const
export const iosBuildProducts = ['debug', 'release', 'ipa'] as const

export type AndroidBuildProduct = (typeof androidBuildProducts)[number]
export type IosBuildProduct = (typeof iosBuildProducts)[number]
export type BuildProduct = AndroidBuildProduct | IosBuildProduct

export const androidBuildSteps = [
  'flutter',
  'signing',
  'version',
  'dependencies',
  'analyze',
  'test',
  'build',
  'output',
] as const

export const iosBuildSteps = [
  'flutter',
  'signing',
  'certificates',
  'provisioning',
  'version',
  'dependencies',
  'analyze',
  'test',
  'build',
  'output',
] as const

export type BuildStepId =
  (typeof androidBuildSteps)[number] | (typeof iosBuildSteps)[number]

export const buildStepStatuses = [
  'pending',
  'running',
  'success',
  'warning',
  'failed',
] as const

export type BuildStepStatus = (typeof buildStepStatuses)[number]

export const buildReasons = [
  'unavailable',
  'debug-signing',
  'missing-signing',
  'missing-version',
  'missing-certificates',
  'missing-provisioning',
  'platform-missing',
  'timeout',
  'flutter-missing',
  'read-failed',
  'nothing-to-validate',
] as const

export type BuildReason = (typeof buildReasons)[number]

export interface BuildStep {
  id: BuildStepId
  status: BuildStepStatus
  output: string
  reason: BuildReason | null
}

export type BuildStepOutcome =
  | {
      ok: true
      status: 'success' | 'warning' | 'failed'
      output: string
      reason: BuildReason | null
    }
  | { ok: false; code: string }

export function stepsForPlatform(
  platform: BuildPlatform,
): readonly BuildStepId[] {
  return platform === 'android' ? androidBuildSteps : iosBuildSteps
}

export function productsForPlatform(
  platform: BuildPlatform,
): readonly BuildProduct[] {
  return platform === 'android' ? androidBuildProducts : iosBuildProducts
}

export function initialBuildSteps(platform: BuildPlatform): BuildStep[] {
  return stepsForPlatform(platform).map((id) => ({
    id,
    status: 'pending',
    output: '',
    reason: null,
  }))
}

export async function runProjectBuildSteps(
  platform: BuildPlatform,
  execute: (step: BuildStepId, built: boolean) => Promise<BuildStepOutcome>,
  onUpdate: (steps: BuildStep[]) => void,
): Promise<{ steps: BuildStep[]; errorCode: string | null }> {
  let steps = initialBuildSteps(platform)
  onUpdate(steps)
  let built = false

  for (const id of stepsForPlatform(platform)) {
    steps = replaceStep(steps, id, {
      status: 'running',
      output: '',
      reason: null,
    })
    onUpdate(steps)
    const outcome = await execute(id, built)
    if (!outcome.ok) {
      steps = replaceStep(steps, id, {
        status: 'failed',
        output: '',
        reason: null,
      })
      onUpdate(steps)
      return { steps, errorCode: outcome.code }
    }

    steps = replaceStep(steps, id, {
      status: outcome.status,
      output: outcome.output,
      reason: outcome.reason,
    })
    onUpdate(steps)
    if (id === 'build' && outcome.status === 'success') {
      built = true
    }
    if (outcome.status === 'failed') {
      return { steps, errorCode: null }
    }
  }

  return { steps, errorCode: null }
}

function replaceStep(
  steps: BuildStep[],
  id: BuildStepId,
  next: {
    status: BuildStepStatus
    output: string
    reason: BuildReason | null
  },
): BuildStep[] {
  return steps.map((step) => (step.id === id ? { ...step, ...next } : step))
}
