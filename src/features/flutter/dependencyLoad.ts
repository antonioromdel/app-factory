export interface DependencyLoad {
  directory: string
  requestId: number
}

export function dependencyLoadMatches(
  load: DependencyLoad | null,
  directory: string | undefined,
  requestId: number,
): boolean {
  return (
    directory !== undefined &&
    load?.directory === directory &&
    load.requestId === requestId
  )
}
