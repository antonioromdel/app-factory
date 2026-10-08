export const flutterPlatforms = ['android', 'ios'] as const

export type FlutterPlatform = (typeof flutterPlatforms)[number]

export interface FlutterTemplate {
  id: 'app'
  template: 'app'
  platforms: readonly FlutterPlatform[]
}

export const flutterTemplates = [
  {
    id: 'app',
    template: 'app',
    platforms: flutterPlatforms,
  },
] as const satisfies readonly FlutterTemplate[]

export interface PublicFlutterTemplate {
  id: FlutterTemplate['id']
  platforms: FlutterPlatform[]
}

export function publicFlutterTemplates(): PublicFlutterTemplate[] {
  return flutterTemplates.map((template) => ({
    id: template.id,
    platforms: [...template.platforms],
  }))
}

export function findFlutterTemplate(id: string): FlutterTemplate | undefined {
  return flutterTemplates.find((template) => template.id === id)
}
