export const splashBackgrounds = {
  white: '#ffffff',
  black: '#000000',
  ink: '#121317',
} as const

export type SplashBackgroundId = keyof typeof splashBackgrounds

export const splashAlignments = [
  'center',
  'top',
  'bottom',
  'left',
  'right',
] as const

export type SplashAlignment = (typeof splashAlignments)[number]

export const minimumSplashLogo = 128
export const recommendedSplashLogo = 512
export const maximumSplashLogo = 4096
export const android12SplashSize = 1152
export const android12SafeDiameter = 768

export const splashDensities = [
  { id: 'mdpi', scale: 1 },
  { id: 'hdpi', scale: 1.5 },
  { id: 'xhdpi', scale: 2 },
  { id: 'xxhdpi', scale: 3 },
  { id: 'xxxhdpi', scale: 4 },
] as const

export const splashFileIds = [
  'splash',
  'android-mdpi',
  'android-hdpi',
  'android-xhdpi',
  'android-xxhdpi',
  'android-xxxhdpi',
  'android12',
  'config',
] as const

export type SplashFileId = (typeof splashFileIds)[number]

export function isSplashAlignment(value: string): value is SplashAlignment {
  return splashAlignments.some((alignment) => alignment === value)
}

export function splashConfiguration(
  color: string,
  alignment: SplashAlignment,
): string {
  return `# Copy splash.png and android12-splash.png into assets/splash/.
# Then run: dart run flutter_native_splash:create
flutter_native_splash:
  color: "${color}"
  image: assets/splash/splash.png
  android_gravity: ${alignment}
  ios_content_mode: ${alignment}

  android_12:
    color: "${color}"
    image: assets/splash/android12-splash.png

  android: true
  ios: true
  web: false
`
}
