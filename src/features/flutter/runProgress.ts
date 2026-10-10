export function stepRunProgress(steps: Array<{ status: string }>): {
  total: number
  completed: number
  current: number | null
} {
  const runningIndex = steps.findIndex((step) => step.status === 'running')

  return {
    total: steps.length,
    completed: steps.filter(
      (step) => step.status !== 'pending' && step.status !== 'running',
    ).length,
    current: runningIndex < 0 ? null : runningIndex + 1,
  }
}
