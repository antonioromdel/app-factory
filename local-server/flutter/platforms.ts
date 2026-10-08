export const flutterPlatforms = ['android', 'ios'] as const

export type FlutterPlatform = (typeof flutterPlatforms)[number]
