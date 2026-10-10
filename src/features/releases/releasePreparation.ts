import type { ReleasePlatform } from '@/types/release.ts'

export const preparationStepIds = [
  'dependencies',
  'analyze',
  'test',
  'version',
  'buildNumber',
  'changelog',
  'android',
  'ios',
  'output',
] as const

export type PreparationStepId = (typeof preparationStepIds)[number]

export const preparationStepStatuses = [
  'pending',
  'running',
  'success',
  'warning',
  'failed',
] as const

export type PreparationStepStatus = (typeof preparationStepStatuses)[number]

export const preparationReasons = [
  'skipped',
  'unavailable',
  'empty-changes',
  'already-present',
  'nothing-to-validate',
  'missing-version',
  'write-failed',
  'timeout',
  'flutter-missing',
  'read-failed',
] as const

export type PreparationReason = (typeof preparationReasons)[number]

export interface PreparationStep {
  id: PreparationStepId
  status: PreparationStepStatus
  output: string
  reason: PreparationReason | null
}

export interface PreparationRelease {
  version: string
  buildNumber: number
  date: string
  platform: ReleasePlatform
  changes?: string
}

export type PreparationStepOutcome =
  | {
      ok: true
      status: 'success' | 'warning' | 'failed'
      output: string
      reason: PreparationReason | null
    }
  | { ok: false; code: string }

export function initialPreparationSteps(): PreparationStep[] {
  return preparationStepIds.map((id) => ({
    id,
    status: 'pending',
    output: '',
    reason: null,
  }))
}

export function platformStepPlan(
  platform: ReleasePlatform,
  step: 'android' | 'ios',
): 'run' | 'skip' {
  if (step === 'android') {
    return platform === 'ios' ? 'skip' : 'run'
  }
  return platform === 'android' ? 'skip' : 'run'
}

export async function runPreparationSteps(
  release: PreparationRelease,
  execute: (
    step: PreparationStepId,
    targets: Array<'android' | 'ios'>,
  ) => Promise<PreparationStepOutcome>,
  onUpdate: (steps: PreparationStep[]) => void,
): Promise<{ steps: PreparationStep[]; errorCode: string | null }> {
  let steps = initialPreparationSteps()
  onUpdate(steps)
  const built: Array<'android' | 'ios'> = []

  for (const id of preparationStepIds) {
    if (
      (id === 'android' || id === 'ios') &&
      platformStepPlan(release.platform, id) === 'skip'
    ) {
      steps = replaceStep(steps, id, {
        status: 'warning',
        output: '',
        reason: 'skipped',
      })
      onUpdate(steps)
      continue
    }

    steps = replaceStep(steps, id, {
      status: 'running',
      output: '',
      reason: null,
    })
    onUpdate(steps)
    const outcome = await execute(id, id === 'output' ? built : [])
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
    if ((id === 'android' || id === 'ios') && outcome.status === 'success') {
      built.push(id)
    }
    if (outcome.status === 'failed') {
      return { steps, errorCode: null }
    }
  }

  return { steps, errorCode: null }
}

function replaceStep(
  steps: PreparationStep[],
  id: PreparationStepId,
  next: {
    status: PreparationStepStatus
    output: string
    reason: PreparationReason | null
  },
): PreparationStep[] {
  return steps.map((step) => (step.id === id ? { ...step, ...next } : step))
}
